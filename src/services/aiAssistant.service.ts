/**
 * AI Assistant Service — Full RAG Pipeline Implementation
 *
 * Flow for sendMessage:
 *   1. Rate limit check (per-user, 20 req / 15 min)
 *   2. Greeting fast-path   → warm welcome, no LLM call
 *   3. Fiqhi guardrail      → scholar redirect, no LLM call
 *   4. Create/load conversation
 *   5. Load last 6 conversation turns
 *   6. Semantic retrieval from approved Zufishan sources
 *   7. Out-of-scope check   → polite refusal if no relevant chunks
 *   8. Build LLM context (system + chunks + history + query)
 *   9. Generate answer (Gemini 1.5 Flash, 30s timeout)
 *  10. Persist USER + ASSISTANT audit logs with token accounting
 *  11. Auto-title conversation on first turn
 *  12. Return structured response with sources and scholarRedirect flag
 */

import { ApiError } from '../utils/apiError'
import { checkRateLimit } from '../utils/aiRateLimiter'
import { utilityRepository } from '../repositories/utility.repository'
import { semanticSearch } from './ai-services/vectorStore'
import { classifyFiqhiQuery } from './ai-services/fiqhiGuardrail'
import {
  isGreeting,
  isOutOfScope,
  GREETING_RESPONSE,
  OUT_OF_SCOPE_RESPONSE,
} from './ai-services/scopeGuardrail'
import {
  buildContext,
  buildSources,
  type ConversationTurn,
} from './ai-services/contextBuilder'
import { generateAnswer } from './ai-services/generator'
import { ingestDocument } from './ai-services/ingestPipeline'
import type { RagSourceType } from '@prisma/client'
import type {
  AiAssistantMessageBody,
  AiAssistantFeedbackBody,
  AiHistoryQuery,
  AdminAiLogsQuery,
  FlagConversationBody,
  FlagLogBody,
} from '../validators/utility.validator'


/** Max conversation turns to include in context (3 user + 3 assistant = 6 turns) */
const MAX_HISTORY_TURNS = 6

// ─── Helper: conversation-title from first user message ───────────────────────

function makeTitle(message: string): string {
  return message.length > 60 ? message.slice(0, 57) + '...' : message
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const aiAssistantService = {

  // ──────────────────────────────────────────────────────────────────────────
  // sendMessage
  // ──────────────────────────────────────────────────────────────────────────
  sendMessage: async (
    userId: string,
    body: AiAssistantMessageBody,
  ): Promise<{
    conversationId: string
    message: string
    sources: ReturnType<typeof buildSources>
    scholarRedirect: boolean
    scholarRedirectCategory: string | null
    isAdversarialAttempt: boolean
    rateLimitStatus: { used: number; limit: number }
  }> => {
    // ── 1. Rate limit ──────────────────────────────────────────────────────
    checkRateLimit(userId)

    const userMessage = body.message.trim()

    // ── 2. Greeting fast-path ──────────────────────────────────────────────
    if (isGreeting(userMessage)) {
      // Create a conversation to persist the greeting exchange
      const convId = body.conversationId
        ?? await utilityRepository.createAiConversation(userId, 'Greeting')

      await utilityRepository.saveAiLog({ conversationId: convId, role: 'USER',      content: userMessage })
      await utilityRepository.saveAiLog({ conversationId: convId, role: 'ASSISTANT', content: GREETING_RESPONSE })

      return {
        conversationId: convId,
        message: GREETING_RESPONSE,
        sources: [],
        scholarRedirect: false,
        scholarRedirectCategory: null,
        isAdversarialAttempt: false,
        rateLimitStatus: { used: 1, limit: 20 },
      }
    }

    // ── 3. Fiqhi guardrail (runs BEFORE retrieval and generation) ────────────
    //
    // Classification is performed on raw user input — cannot be bypassed
    // by rephrasing, roleplay, third-party framing, or prompt injection.
    // Fail-safe: uncertain religious signals also route to scholar.
    const fiqhiResult = classifyFiqhiQuery(userMessage)

    if (fiqhiResult.isFiqhi) {
      const convId = body.conversationId
        ?? await utilityRepository.createAiConversation(userId, makeTitle(userMessage))

      // Audit log — USER turn with fiqhi classification
      await utilityRepository.saveAiLog({
        conversationId: convId,
        role: 'USER',
        content: userMessage,
        topicCategory:  fiqhiResult.category,
        isRedirected:   true,
        isAdversarial:  fiqhiResult.isAdversarial,
        errorStatus:    'FIQHI_REDIRECT',
      })

      // Audit log — ASSISTANT redirect response with full classification metadata
      await utilityRepository.saveAiLog({
        conversationId: convId,
        role: 'ASSISTANT',
        content:         fiqhiResult.redirectMessage!,
        modelUsed:       'fiqhi-guardrail',
        latencyMs:       0,
        topicCategory:   fiqhiResult.category,
        isRedirected:    true,
        isAdversarial:   fiqhiResult.isAdversarial,
        errorStatus:     'FIQHI_REDIRECT',
      })

      return {
        conversationId: convId,
        message: fiqhiResult.redirectMessage!,
        sources: [],
        scholarRedirect: true,
        scholarRedirectCategory: fiqhiResult.category,
        isAdversarialAttempt: fiqhiResult.isAdversarial,
        rateLimitStatus: { used: 1, limit: 20 },
      }
    }

    // ── 4. Create / load conversation ──────────────────────────────────────
    const conversationId = body.conversationId
      ?? await utilityRepository.createAiConversation(userId)

    // ── 5. Load conversation history (last N turns) ────────────────────────
    const historyResult = body.conversationId
      ? await utilityRepository.getConversationHistory(conversationId, userId)
      : null

    if (body.conversationId && !historyResult) {
      throw ApiError.forbidden('Conversation not found or access denied')
    }

    const allLogs = historyResult?.messages ?? []
    const history: ConversationTurn[] = allLogs
      .slice(-MAX_HISTORY_TURNS)
      .map((l) => ({ role: l.role as 'USER' | 'ASSISTANT', content: l.content }))

    const isFirstTurn = allLogs.length === 0

    // ── 6. Semantic retrieval ──────────────────────────────────────────────
    const rankedChunks = await semanticSearch(userMessage, { k: 5 })

    // ── 7. Out-of-scope check ──────────────────────────────────────────────
    if (isOutOfScope(rankedChunks.map((c) => c.score))) {
      const convId = conversationId
      const topScore = rankedChunks.length > 0 ? rankedChunks[0].score : null

      await utilityRepository.saveAiLog({
        conversationId: convId,
        role: 'USER',
        content: userMessage,
        isOutOfScope: true,
        errorStatus: 'SCOPE_REJECTED',
        retrievedChunkCount: rankedChunks.length,
        topSimilarityScore: topScore,
      })
      await utilityRepository.saveAiLog({
        conversationId: convId,
        role: 'ASSISTANT',
        content: OUT_OF_SCOPE_RESPONSE,
        isOutOfScope: true,
        errorStatus: 'SCOPE_REJECTED',
        retrievedChunkCount: rankedChunks.length,
        topSimilarityScore: topScore,
      })

      if (isFirstTurn) {
        await utilityRepository.updateConversationTitle(convId, makeTitle(userMessage))
      }

      return {
        conversationId: convId,
        message: OUT_OF_SCOPE_RESPONSE,
        sources: [],
        scholarRedirect: false,
        scholarRedirectCategory: null,
        isAdversarialAttempt: false,
        rateLimitStatus: { used: 1, limit: 20 },
      }
    }

    // ── 8. Build context prompt ────────────────────────────────────────────
    const prompt = buildContext(rankedChunks, history, userMessage)

    // ── 9. Generate answer ─────────────────────────────────────────────────
    const result = await generateAnswer(prompt)

    // ── 10. Persist audit logs with full metadata ──────────────────────────────
    const topScore = rankedChunks.length > 0 ? rankedChunks[0].score : null

    await utilityRepository.saveAiLog({
      conversationId,
      role: 'USER',
      content: userMessage,
      promptTokens:        result.promptTokens,
      retrievedChunkCount: rankedChunks.length,
      topSimilarityScore:  topScore,
    })

    await utilityRepository.saveAiLog({
      conversationId,
      role: 'ASSISTANT',
      content:             result.text,
      promptTokens:        result.promptTokens,
      completionTokens:    result.completionTokens,
      totalTokens:         result.totalTokens,
      modelUsed:           result.modelUsed,
      latencyMs:           result.latencyMs,
      retrievedChunkCount: rankedChunks.length,
      topSimilarityScore:  topScore,
    })

    // ── 11. Auto-title on first turn ───────────────────────────────────────
    if (isFirstTurn) {
      await utilityRepository.updateConversationTitle(conversationId, makeTitle(userMessage))
    }

    // ── 12. Return response ────────────────────────────────────────────────
    return {
      conversationId,
      message: result.text,
      sources: buildSources(rankedChunks),
      scholarRedirect: false,
      scholarRedirectCategory: null,
      isAdversarialAttempt: false,
      rateLimitStatus: { used: 1, limit: 20 },
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // getHistory (supports ?conversationId= query parameter)
  // ──────────────────────────────────────────────────────────────────────────
  getHistory: async (
    userId: string,
    query: AiHistoryQuery,
  ) => {
    if (query.conversationId) {
      const history = await utilityRepository.getConversationHistory(
        query.conversationId,
        userId,
        { page: query.page, limit: query.limit },
      )
      if (!history) {
        throw ApiError.notFound('Conversation not found')
      }
      return history
    }

    return utilityRepository.getUserConversations(userId, {
      page: query.page,
      limit: query.limit,
    })
  },

  // ──────────────────────────────────────────────────────────────────────────
  // getConversations
  // ──────────────────────────────────────────────────────────────────────────
  getConversations: async (userId: string, pagination?: { page?: number; limit?: number }) => {
    return utilityRepository.getUserConversations(userId, pagination)
  },

  // ──────────────────────────────────────────────────────────────────────────
  // getConversationHistory
  // ──────────────────────────────────────────────────────────────────────────
  getConversationHistory: async (
    conversationId: string,
    userId: string,
    pagination?: { page?: number; limit?: number },
  ) => {
    const result = await utilityRepository.getConversationHistory(conversationId, userId, pagination)
    if (!result) {
      throw ApiError.notFound('Conversation not found')
    }
    return result
  },

  // ──────────────────────────────────────────────────────────────────────────
  // submitFeedback
  // ──────────────────────────────────────────────────────────────────────────
  submitFeedback: async (
    userId: string,
    body: AiAssistantFeedbackBody,
  ) => {
    const targetLogId = (body.messageId || body.logId)!

    // 1. Authorize: verify message belongs to authenticated user's conversation
    const log = await utilityRepository.getAiLogForUser(targetLogId, userId)
    if (!log) {
      throw ApiError.notFound('Message not found')
    }

    // 2. Prevent duplicate feedback
    if (log.rating !== null) {
      throw ApiError.conflict('Feedback has already been submitted for this message')
    }

    // 3. Persist feedback
    return utilityRepository.submitFeedback(targetLogId, body.rating, body.comment)
  },

  // ──────────────────────────────────────────────────────────────────────────
  // getAdminLogs
  // ──────────────────────────────────────────────────────────────────────────
  getAdminLogs: async (query: AdminAiLogsQuery) => {
    return utilityRepository.getAdminLogs(query)
  },

  // ──────────────────────────────────────────────────────────────────────────
  // getAdminLogById
  // ──────────────────────────────────────────────────────────────────────────
  getAdminLogById: async (logId: string) => {
    const log = await utilityRepository.getAdminLogById(logId)
    if (!log) throw ApiError.notFound('Log entry not found')
    return log
  },

  // ──────────────────────────────────────────────────────────────────────────
  // flagConversation (admin)
  // ──────────────────────────────────────────────────────────────────────────
  flagConversation: async (conversationId: string, body: FlagConversationBody) => {
    return utilityRepository.flagConversation(conversationId, body.isFlagged, body.reason)
  },

  // ──────────────────────────────────────────────────────────────────────────
  // flagLog (admin)
  // ──────────────────────────────────────────────────────────────────────────
  flagLog: async (logId: string, body: FlagLogBody) => {
    return utilityRepository.flagAiLog(logId, body.isFlagged)
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ingestDocument (admin)
  // ──────────────────────────────────────────────────────────────────────────
  ingestDocument: async (data: {
    sourceType: RagSourceType
    title: string
    content: string
    sourceId?: string
    url?: string
  }) => {
    const documentId = await ingestDocument(data)
    return { documentId, message: `Document "${data.title}" ingested successfully` }
  },
}

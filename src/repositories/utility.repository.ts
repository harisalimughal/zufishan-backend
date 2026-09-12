/**
 * Utility Repository — data access layer for all Utility module features.
 *
 * PII policy:
 * - List endpoints return contentPreview (first 120 chars) NOT full content.
 * - Full content is only returned by getAdminLogById (single-record detail).
 * - userId is exposed (opaque ID) but never email, fullName, or passwordHash.
 * - Conversation titles are shown only to the conversation owner or admin.
 */

import { prisma } from '../config/prisma'
import type { AiAssistantRole, RagSourceType } from '@prisma/client'

// ─── PII Helper ───────────────────────────────────────────────────────────────

/** Truncates message content for list views. Full content in detail endpoints only. */
function previewContent(content: string, maxLen = 120): string {
  if (content.startsWith('[FIQHI_REDIRECT]')) return '[FIQHI_REDIRECT — see detail]'
  return content.length > maxLen ? content.slice(0, maxLen) + '…' : content
}

// ============================================================
// TASBIH
// ============================================================

export const utilityRepository = {
  saveTasbihSession: async (
    userId: string,
    data: { phrase: string; count: number; target: number; sessionDate?: string },
  ) => {
    return prisma.tasbihSession.create({
      data: {
        userId,
        phrase: data.phrase,
        count: data.count,
        target: data.target,
        isCompleted: data.count >= data.target,
        sessionDate: data.sessionDate ? new Date(data.sessionDate) : new Date(),
      },
    })
  },

  getUserTasbihHistory: async (userId: string) => {
    return prisma.tasbihSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  },

  // ============================================================
  // AI ASSISTANT — CONVERSATIONS
  // ============================================================

  createAiConversation: async (userId: string, title?: string): Promise<string> => {
    const conv = await prisma.aiAssistantConversation.create({
      data: { userId, title: title ?? null },
      select: { id: true },
    })
    return conv.id
  },

  updateConversationTitle: async (conversationId: string, title: string): Promise<void> => {
    await prisma.aiAssistantConversation.update({
      where: { id: conversationId },
      data: { title },
    })
  },

  getUserConversations: async (
    userId: string,
    pagination?: { page?: number; limit?: number },
  ) => {
    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 20
    const skip = (page - 1) * limit
    const where = { userId, isActive: true }

    const [total, conversations] = await Promise.all([
      prisma.aiAssistantConversation.count({ where }),
      prisma.aiAssistantConversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { logs: true } },
        },
      }),
    ])

    return {
      conversations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  },

  // ============================================================
  // AI ASSISTANT — AUDIT LOGS
  // ============================================================

  /**
   * Saves a single message turn with full audit metadata.
   */
  saveAiLog: async (data: {
    conversationId: string
    role: AiAssistantRole
    content: string
    // Token accounting
    promptTokens?: number | null
    completionTokens?: number | null
    totalTokens?: number | null
    // Provider metadata
    modelUsed?: string | null
    latencyMs?: number | null
    // Topic / routing classification
    topicCategory?: string | null
    isRedirected?: boolean
    isAdversarial?: boolean
    isOutOfScope?: boolean
    // Retrieval metadata
    retrievedChunkCount?: number | null
    topSimilarityScore?: number | null
    // Error / status
    errorStatus?: string | null
  }) => {
    return prisma.aiAssistantLog.create({
      data: {
        conversationId:     data.conversationId,
        role:               data.role,
        content:            data.content,
        promptTokens:       data.promptTokens       ?? null,
        completionTokens:   data.completionTokens   ?? null,
        totalTokens:        data.totalTokens         ?? null,
        modelUsed:          data.modelUsed           ?? null,
        latencyMs:          data.latencyMs           ?? null,
        topicCategory:      data.topicCategory       ?? null,
        isRedirected:       data.isRedirected        ?? false,
        isAdversarial:      data.isAdversarial       ?? false,
        isOutOfScope:       data.isOutOfScope        ?? false,
        retrievedChunkCount: data.retrievedChunkCount ?? null,
        topSimilarityScore: data.topSimilarityScore  ?? null,
        errorStatus:        data.errorStatus         ?? null,
      },
    })
  },

  /**
   * Fetches conversation history for the owner (verifies userId).
   * Supports pagination and returns messages in chronological order.
   */
  getConversationHistory: async (
    conversationId: string,
    userId: string,
    pagination?: { page?: number; limit?: number },
  ) => {
    const conv = await prisma.aiAssistantConversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })
    if (!conv) return null

    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 20
    const skip = (page - 1) * limit
    const where = { conversationId }

    const [total, logs] = await Promise.all([
      prisma.aiAssistantLog.count({ where }),
      prisma.aiAssistantLog.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          role: true,
          content: true,       // full content for owner
          modelUsed: true,
          latencyMs: true,
          rating: true,
          feedbackComment: true,
          isRedirected: true,
          isOutOfScope: true,
          createdAt: true,
        },
      }),
    ])

    return {
      conversation: conv,
      messages: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  },

  /**
   * Retrieves an AI log turn verifying ownership through its parent conversation.
   */
  getAiLogForUser: async (logId: string, userId: string) => {
    return prisma.aiAssistantLog.findFirst({
      where: {
        id: logId,
        conversation: { userId },
      },
      select: {
        id: true,
        role: true,
        rating: true,
        feedbackComment: true,
        conversationId: true,
        conversation: {
          select: { userId: true },
        },
      },
    })
  },

  // ============================================================
  // AI ASSISTANT — ADMIN LOGS (full audit view)
  // ============================================================

  /**
   * Returns paginated AI log entries for admin/moderator review.
   * Content is TRUNCATED to a preview — use getAdminLogById for full content.
   *
   * PII: userId (opaque) is exposed; email/name are NOT selected.
   */
  getAdminLogs: async (query: {
    // Identity filters
    userId?: string
    conversationId?: string
    // Behaviour filters
    isRedirected?: boolean
    isAdversarial?: boolean
    isOutOfScope?: boolean
    isFlagged?: boolean
    // Classification filters
    topicCategory?: string
    errorStatus?: string
    modelUsed?: string
    rating?: string
    role?: 'USER' | 'ASSISTANT'
    // Date range
    dateFrom?: Date
    dateTo?: Date
    // Pagination
    page: number
    limit: number
  }) => {
    const skip = (query.page - 1) * query.limit

    const where: Record<string, unknown> = {}

    // Conversation-level filters
    const convFilter: Record<string, unknown> = {}
    if (query.userId) convFilter['userId'] = query.userId
    if (query.conversationId) where['conversationId'] = query.conversationId
    if (Object.keys(convFilter).length) where['conversation'] = convFilter

    // Log-level filters
    if (query.isRedirected !== undefined) where['isRedirected']  = query.isRedirected
    if (query.isAdversarial !== undefined) where['isAdversarial'] = query.isAdversarial
    if (query.isOutOfScope !== undefined) where['isOutOfScope']   = query.isOutOfScope
    if (query.isFlagged !== undefined) where['isFlagged']         = query.isFlagged
    if (query.topicCategory) where['topicCategory'] = query.topicCategory
    if (query.errorStatus)   where['errorStatus']   = query.errorStatus
    if (query.modelUsed)     where['modelUsed']     = query.modelUsed
    if (query.rating)        where['rating']        = query.rating
    if (query.role)          where['role']          = query.role

    // Date range
    if (query.dateFrom || query.dateTo) {
      where['createdAt'] = {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo   ? { lte: query.dateTo }   : {}),
      }
    }

    const [total, logs] = await Promise.all([
      prisma.aiAssistantLog.count({ where: where as never }),
      prisma.aiAssistantLog.findMany({
        where: where as never,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          role: true,
          // PII: truncated preview only in list view
          content: true,
          // Token accounting
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          // Provider
          modelUsed: true,
          latencyMs: true,
          // Classification
          topicCategory: true,
          isRedirected: true,
          isAdversarial: true,
          isOutOfScope: true,
          // Retrieval
          retrievedChunkCount: true,
          topSimilarityScore: true,
          // Status / flags
          errorStatus: true,
          isFlagged: true,
          // Feedback
          rating: true,
          feedbackComment: true,
          createdAt: true,
          // Conversation (PII: userId only, no email/name)
          conversation: {
            select: {
              id: true,
              userId: true,   // opaque ID only
              title: true,
              isFlagged: true,
              flagReason: true,
            },
          },
        },
      }),
    ])

    // Truncate content to preview in list response
    const sanitizedLogs = logs.map((log) => ({
      ...log,
      contentPreview: previewContent(log.content),
      content: undefined,  // strip full content from list view
    }))

    return {
      logs: sanitizedLogs,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  },

  /**
   * Returns FULL detail of a single log entry for admin drill-down.
   * Only admin/moderator should call this endpoint.
   */
  getAdminLogById: async (logId: string) => {
    return prisma.aiAssistantLog.findUnique({
      where: { id: logId },
      select: {
        id: true,
        role: true,
        content: true,          // full content allowed in single-record detail
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        modelUsed: true,
        latencyMs: true,
        topicCategory: true,
        isRedirected: true,
        isAdversarial: true,
        isOutOfScope: true,
        retrievedChunkCount: true,
        topSimilarityScore: true,
        errorStatus: true,
        isFlagged: true,
        rating: true,
        feedbackComment: true,
        createdAt: true,
        conversation: {
          select: {
            id: true,
            userId: true,   // opaque ID only
            title: true,
            isFlagged: true,
            flagReason: true,
            flaggedAt: true,
          },
        },
      },
    })
  },

  /**
   * Flags or unflags a specific log entry for admin review.
   */
  flagAiLog: async (logId: string, flag: boolean) => {
    return prisma.aiAssistantLog.update({
      where: { id: logId },
      data: { isFlagged: flag },
      select: { id: true, isFlagged: true },
    })
  },

  /**
   * Flags or unflags an entire conversation thread for admin review.
   */
  flagConversation: async (conversationId: string, flag: boolean, reason?: string) => {
    return prisma.aiAssistantConversation.update({
      where: { id: conversationId },
      data: {
        isFlagged: flag,
        flaggedAt: flag ? new Date() : null,
        flagReason: flag ? (reason ?? null) : null,
      },
      select: {
        id: true,
        isFlagged: true,
        flaggedAt: true,
        flagReason: true,
      },
    })
  },

  // ============================================================
  // AI ASSISTANT — FEEDBACK
  // ============================================================

  submitFeedback: async (logId: string, rating: string, comment?: string) => {
    return prisma.aiAssistantLog.update({
      where: { id: logId },
      data: { rating, feedbackComment: comment ?? null },
      select: {
        id: true,
        conversationId: true,
        rating: true,
        feedbackComment: true,
        createdAt: true,
      },
    })
  },

  // ============================================================
  // RAG DOCUMENTS — ADMIN INGEST
  // ============================================================

  createRagDocument: async (data: {
    sourceType: RagSourceType
    title: string
    content: string
    sourceId?: string
    url?: string
  }) => {
    return prisma.ragDocument.create({
      data: {
        sourceType: data.sourceType,
        title: data.title,
        content: data.content,
        sourceId: data.sourceId ?? null,
        url: data.url ?? null,
      },
    })
  },
}

export default utilityRepository

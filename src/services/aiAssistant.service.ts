import { ApiError } from '../utils/apiError'
import { utilityRepository } from '../repositories/utility.repository'
import type { AiAssistantMessageBody } from '../validators/utility.validator'

/**
 * AI Assistant Service
 *
 * Feature logic to be implemented:
 * - Send a user message to the AI provider and stream/return response
 * - Persist conversation history in the database (conversationId per session)
 * - AI Provider options: Google Gemini API, OpenAI GPT, or Anthropic Claude
 * - Context: inject relevant course data / Islamic knowledge base as system prompt
 *
 * Schemas to add in prisma/schema.prisma:
 *   model AiUtilityConversation {
 *     id        String              @id @default(cuid())
 *     userId    String
 *     user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
 *     createdAt DateTime            @default(now())
 *     messages  AiUtilityMessage[]
 *     @@index([userId])
 *     @@map("ai_utility_conversations")
 *   }
 *
 *   model AiUtilityMessage {
 *     id             String                  @id @default(cuid())
 *     conversationId String
 *     conversation   AiUtilityConversation   @relation(fields: [conversationId], references: [id], onDelete: Cascade)
 *     userId         String
 *     role           MessageRole             // reuse existing enum: USER | ASSISTANT
 *     content        String
 *     createdAt      DateTime                @default(now())
 *     @@index([conversationId])
 *     @@map("ai_utility_messages")
 *   }
 */
export const aiAssistantService = {
  sendMessage: async (
    userId: string,
    body: AiAssistantMessageBody,
  ): Promise<Record<string, unknown>> => {
    // TODO:
    // 1. If no conversationId: create new conversation via repository
    // 2. Load conversation history from repository
    // 3. Send history + new message to AI provider (Gemini / OpenAI)
    // 4. Save user message + AI response to repository
    // 5. Return AI response

    const _conversationId = body.conversationId
      ?? (await utilityRepository.createAiConversation(userId))

    throw ApiError.internal('AI Assistant feature is not yet implemented')
  },

  getConversations: async (userId: string): Promise<Record<string, unknown>> => {
    await utilityRepository.getUserConversations(userId)
    throw ApiError.internal('AI conversation history is not yet implemented')
  },

  getConversationHistory: async (
    conversationId: string,
    userId: string,
  ): Promise<Record<string, unknown>> => {
    await utilityRepository.getConversationHistory(conversationId, userId)
    throw ApiError.internal('AI conversation history is not yet implemented')
  },

  submitFeedback: async (
    _userId: string,
    _body: { logId: string; rating: string; comment?: string },
  ): Promise<Record<string, unknown>> => {
    // TODO: update ai_assistant_logs row with feedback fields
    throw ApiError.internal('AI feedback feature is not yet implemented')
  },

  getAdminLogs: async (
    _query: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    // TODO: admin paginated view of ai_assistant_logs with filters
    throw ApiError.internal('Admin AI logs feature is not yet implemented')
  },
}

/**
 * Utility Repository — data access layer for all Utility module features.
 *
 * Currently contains placeholder stubs. Real Prisma queries will be added
 * as each feature's schema models are defined and migrated.
 *
 * Pattern: every method accepts typed inputs and returns typed Prisma results.
 * Import { prisma } from '../../config/prisma' once models exist.
 */

// ─── placeholder until Prisma models are added ───────────────────────────────
// import { prisma } from '../../config/prisma'

// ============================================================
// TASBIH  (needs DB persistence)
// ============================================================

export const utilityRepository = {
  // --- Tasbih ---
  saveTasbihSession: async (_userId: string, _data: {
    phrase: string
    count: number
    target: number
    sessionDate?: string
  }) => {
    // TODO: prisma.tasbihSession.create({ data: { userId, ...data } })
    throw new Error('NOT_IMPLEMENTED')
  },

  getUserTasbihHistory: async (_userId: string) => {
    // TODO: prisma.tasbihSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    throw new Error('NOT_IMPLEMENTED')
  },

  // --- AI Assistant Conversations ---
  createAiConversation: async (_userId: string) => {
    // TODO: prisma.aiUtilityConversation.create({ data: { userId } })
    throw new Error('NOT_IMPLEMENTED')
  },

  saveAiMessage: async (_data: {
    conversationId: string
    userId: string
    role: 'USER' | 'ASSISTANT'
    content: string
  }) => {
    // TODO: prisma.aiUtilityMessage.create({ data })
    throw new Error('NOT_IMPLEMENTED')
  },

  getConversationHistory: async (_conversationId: string, _userId: string) => {
    // TODO: prisma.aiUtilityMessage.findMany({ where: { conversationId, userId }, orderBy: { createdAt: 'asc' } })
    throw new Error('NOT_IMPLEMENTED')
  },

  getUserConversations: async (_userId: string) => {
    // TODO: prisma.aiUtilityConversation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    throw new Error('NOT_IMPLEMENTED')
  },
}

export default utilityRepository

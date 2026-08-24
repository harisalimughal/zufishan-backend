import { ApiError } from '../utils/apiError'
import { utilityRepository } from '../repositories/utility.repository'
import type { TasbihSaveBody } from '../validators/utility.validator'

/**
 * Tasbih Service
 *
 * Feature logic to be implemented:
 * - Save a user's tasbih (dhikr counter) session to the database
 * - Retrieve the user's tasbih history
 *
 * Schema to add in prisma/schema.prisma:
 *   model TasbihSession {
 *     id          String   @id @default(cuid())
 *     userId      String
 *     user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
 *     phrase      String   // e.g. "SubhanAllah"
 *     count       Int
 *     target      Int      @default(33)
 *     sessionDate DateTime @default(now())
 *     createdAt   DateTime @default(now())
 *     @@index([userId])
 *     @@map("tasbih_sessions")
 *   }
 */
export const tasbihService = {
  saveSession: async (userId: string, body: TasbihSaveBody): Promise<Record<string, unknown>> => {
    // TODO: delegate to utilityRepository.saveTasbihSession once schema is migrated
    await utilityRepository.saveTasbihSession(userId, {
      phrase: body.phrase,
      count: body.count,
      target: body.target ?? 33,
      sessionDate: body.sessionDate,
    })
    throw ApiError.internal('Tasbih session persistence is not yet implemented')
  },

  getHistory: async (userId: string): Promise<Record<string, unknown>> => {
    await utilityRepository.getUserTasbihHistory(userId)
    throw ApiError.internal('Tasbih history feature is not yet implemented')
  },

  getStats: async (_userId: string): Promise<Record<string, unknown>> => {
    // TODO: aggregate from tasbih_sessions
    // e.g. total sessions, total count, most used phrase, streak
    throw ApiError.internal('Tasbih stats feature is not yet implemented')
  },
}

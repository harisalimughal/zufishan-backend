import { ApiError } from '../utils/apiError'
import type { AzkarQuery } from '../validators/utility.validator'

/**
 * Azkar Service
 *
 * Feature logic to be implemented:
 * - Return a paginated list of Islamic Azkar (remembrances / supplications)
 * - Data source options:
 *   A) Seed the azkar data into the PostgreSQL database (recommended — fast, offline)
 *   B) Fetch from a public Islamic content API
 * - Categories: morning, evening, sleep, prayer, general
 * - Each azkar item: { id, arabic, transliteration, translation, repetitions, reference, category }
 *
 * Schema to add in prisma/schema.prisma:
 *   model AzkarItem {
 *     id              String   @id @default(cuid())
 *     arabic          String
 *     transliteration String?
 *     translation     String
 *     repetitions     Int      @default(1)
 *     reference       String?
 *     category        AzkarCategory
 *     createdAt       DateTime @default(now())
 *   }
 */
export const azkarService = {
  getAzkar: async (_query: AzkarQuery): Promise<Record<string, unknown>> => {
    // TODO: prisma.azkarItem.findMany({ where: { category }, skip, take })
    throw ApiError.internal('Azkar library feature is not yet implemented')
  },
}

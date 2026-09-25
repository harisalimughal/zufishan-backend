/**
 * Zakat Calculation Repository
 *
 * Data-access for persisted `zakat_calculations` rows.
 * Every read that returns user history MUST filter by `userId` so one
 * authenticated caller can never see another user's calculations.
 */

import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../config/prisma'

export interface ZakatCalculationRow {
  id: string
  userId: string | null
  goldGrams: Decimal
  silverGrams: Decimal
  cashSavings: Decimal
  investments: Decimal
  businessAssets: Decimal
  receivables: Decimal
  totalZakatableAssets: Decimal
  nisabThreshold: Decimal
  zakatDue: Decimal
  zakatableAboveNisab: boolean
  currency: string
  nisabRateId: string | null
  createdAt: Date
}

export interface FindUserHistoryParams {
  /** Authenticated user id — always required; never omitted. */
  userId: string
  page: number
  limit: number
  /** Optional ISO 4217 filter (already uppercased by validator). */
  currency?: string
}

export const zakatCalculationRepository = {
  /**
   * Paginated history for a single user, newest first.
   * `userId` is a required equality filter on every query.
   */
  findByUserIdPaginated: async (
    params: FindUserHistoryParams,
  ): Promise<{ rows: ZakatCalculationRow[]; total: number }> => {
    const { userId, page, limit, currency } = params

    if (!userId || typeof userId !== 'string') {
      // Defence-in-depth: repository refuses to run an unscoped history query.
      throw new Error('zakatCalculationRepository.findByUserIdPaginated requires userId')
    }

    const where = {
      userId,
      ...(currency ? { currency } : {}),
    }

    const skip = (page - 1) * limit

    const [rows, total] = await Promise.all([
      prisma.zakatCalculation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        // Explicit select — never join other users or unrelated PII.
        select: {
          id: true,
          userId: true,
          goldGrams: true,
          silverGrams: true,
          cashSavings: true,
          investments: true,
          businessAssets: true,
          receivables: true,
          totalZakatableAssets: true,
          nisabThreshold: true,
          zakatDue: true,
          zakatableAboveNisab: true,
          currency: true,
          nisabRateId: true,
          createdAt: true,
        },
      }),
      prisma.zakatCalculation.count({ where }),
    ])

    return { rows: rows as ZakatCalculationRow[], total }
  },
}

export default zakatCalculationRepository

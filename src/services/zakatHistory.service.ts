/**
 * Zakat History Service
 *
 * Returns paginated calculation history for the authenticated user only.
 * `userId` always comes from `req.user.id` (auth middleware) — never from
 * query/body parameters — so callers cannot request another user's rows.
 */

import { Decimal } from '@prisma/client/runtime/library'
import { ApiError } from '../utils/apiError'
import { moneyToNumber } from '../utils/money'
import {
  zakatCalculationRepository,
  type ZakatCalculationRow,
} from '../repositories/zakatCalculation.repository'
import type { ZakatHistoryQuery } from '../validators/utility.validator'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ZakatHistoryItem {
  id: string
  userId: string
  goldGrams: number
  silverGrams: number
  cashSavings: number
  investments: number
  businessAssets: number
  receivables: number
  totalZakatableAssets: number
  nisabThreshold: number
  zakatDue: number
  zakatableAboveNisab: boolean
  currency: string
  nisabRateId: string | null
  createdAt: string
}

export interface ZakatHistoryResult {
  items: ZakatHistoryItem[]
  pagination: PaginationMeta
}

export const zakatHistoryService = {
  /**
   * GET /api/v1/utilities/zakat/history?page=&limit=&currency=
   *
   * @param userId  Authenticated user id from JWT — required, never optional.
   * @param query   Validated pagination / filter params (no userId field).
   */
  getHistory: async (
    userId: string,
    query: ZakatHistoryQuery,
  ): Promise<ZakatHistoryResult> => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw ApiError.unauthorized('Authentication required')
    }

    const page = query.page
    const limit = query.limit

    const { rows, total } = await zakatCalculationRepository.findByUserIdPaginated({
      userId,
      page,
      limit,
      ...(query.currency ? { currency: query.currency } : {}),
    })

    // Defence-in-depth: drop any row that somehow does not belong to this user.
    const items = rows
      .filter((row) => row.userId === userId)
      .map(toHistoryItem)

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: totalPages > 0 && page < totalPages,
        hasPrev: page > 1 && totalPages > 0,
      },
    }
  },
}

function toHistoryItem(row: ZakatCalculationRow): ZakatHistoryItem {
  return {
    id: row.id,
    // Non-null after the isolation filter above.
    userId: row.userId as string,
    goldGrams: decimalToNumber(row.goldGrams),
    silverGrams: decimalToNumber(row.silverGrams),
    cashSavings: decimalToNumber(row.cashSavings),
    investments: decimalToNumber(row.investments),
    businessAssets: decimalToNumber(row.businessAssets),
    receivables: decimalToNumber(row.receivables),
    totalZakatableAssets: decimalToNumber(row.totalZakatableAssets),
    nisabThreshold: decimalToNumber(row.nisabThreshold),
    zakatDue: decimalToNumber(row.zakatDue),
    zakatableAboveNisab: row.zakatableAboveNisab,
    currency: row.currency,
    nisabRateId: row.nisabRateId,
    createdAt: row.createdAt.toISOString(),
  }
}

function decimalToNumber(value: Decimal): number {
  return moneyToNumber(value.toString())
}

export default zakatHistoryService

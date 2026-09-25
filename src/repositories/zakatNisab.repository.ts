/**
 * Zakat Nisab Rate Repository
 *
 * Data-access layer for the ZakatNisabRate Prisma model.
 * One row per currency per effective date (@@unique [currency, effectiveDate]).
 *
 * Caching strategy:
 *   - Rates are refreshed at most ONCE PER DAY per currency.
 *   - findLatestValid()  → latest row whose effectiveDate <= today (not expired today).
 *   - findTodayCached()  → today-specific row (tells us if we already fetched today).
 *   - upsertRate()       → insert or update the row for today.
 */

import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../config/prisma'

// ─── Output Types ─────────────────────────────────────────────────────────────

export interface NisabRateRow {
  id: string
  goldPricePerGram: Decimal
  silverPricePerGram: Decimal
  currency: string
  effectiveDate: Date
  nisabGoldGrams: Decimal
  nisabSilverGrams: Decimal
  nisabValueGold: Decimal
  nisabValueSilver: Decimal
  source: string | null
  createdAt: Date
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface NisabRateWriteInput {
  goldPricePerGram: number
  silverPricePerGram: number
  currency: string
  effectiveDate: Date
  nisabGoldGrams: number
  nisabSilverGrams: number
  nisabValueGold: number
  nisabValueSilver: number
  source: string
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const zakatNisabRepository = {
  /**
   * Returns today's cached row for the given currency, or null if not yet fetched today.
   * Used to decide whether to call the market API.
   */
  findTodayCached: async (currency: string): Promise<NisabRateRow | null> => {
    const today = todayUTC()

    const row = await prisma.zakatNisabRate.findFirst({
      where: {
        currency: currency.toUpperCase(),
        effectiveDate: today,
      },
      orderBy: { createdAt: 'desc' },
    })

    return row as NisabRateRow | null
  },

  /**
   * Returns the most recently stored row for this currency regardless of date.
   * Used as a fallback when the market API is unavailable.
   * Never returns null if at least one historical row exists.
   */
  findLatestValid: async (currency: string): Promise<NisabRateRow | null> => {
    const row = await prisma.zakatNisabRate.findFirst({
      where: { currency: currency.toUpperCase() },
      orderBy: { effectiveDate: 'desc' },
    })

    return row as NisabRateRow | null
  },

  /**
   * Insert or update the rate for the given currency + effectiveDate.
   * Uses upsert on the unique constraint to avoid race-condition duplicates.
   */
  upsertRate: async (input: NisabRateWriteInput): Promise<NisabRateRow> => {
    const effectiveDate = todayUTCFromDate(input.effectiveDate)
    const currency = input.currency.toUpperCase()

    const data = {
      goldPricePerGram:   new Decimal(input.goldPricePerGram),
      silverPricePerGram: new Decimal(input.silverPricePerGram),
      currency,
      effectiveDate,
      nisabGoldGrams:   new Decimal(input.nisabGoldGrams),
      nisabSilverGrams: new Decimal(input.nisabSilverGrams),
      nisabValueGold:   new Decimal(input.nisabValueGold),
      nisabValueSilver: new Decimal(input.nisabValueSilver),
      source: input.source,
    }

    const row = await prisma.zakatNisabRate.upsert({
      where: {
        currency_effectiveDate: {
          currency,
          effectiveDate,
        },
      },
      create: data,
      update: {
        goldPricePerGram:   data.goldPricePerGram,
        silverPricePerGram: data.silverPricePerGram,
        nisabValueGold:     data.nisabValueGold,
        nisabValueSilver:   data.nisabValueSilver,
        source:             data.source,
      },
    })

    return row as NisabRateRow
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today as UTC midnight Date (removes time component). */
function todayUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function todayUTCFromDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default zakatNisabRepository

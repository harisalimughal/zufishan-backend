/**
 * Zakat Nisab Rate Service
 *
 * Responsibilities:
 *   1. Check PostgreSQL cache for today's rate (one fetch per currency per day).
 *   2. On cache miss → call live market price API (GoldAPI.io, MetalPriceAPI fallback).
 *   3. Compute Nisab values using Islamic standard weights:
 *        Gold Nisab  = 85 g  (7.5 tola — Hanafi/most scholars)
 *        Silver Nisab= 595 g (52.5 tola)
 *   4. Persist result to `zakat_nisab_rates` table.
 *   5. On API failure → return latest cached row, clearly marking it as stale.
 *   6. If no rate exists at all (fresh DB, no API key) → 503 with explanation.
 *
 * Islamic Nisab standard weights used:
 *   - Gold:   85 g (Hanafi + most contemporary scholars)
 *   - Silver: 595 g
 *
 * The methodology (85g gold / 595g silver) is stored alongside the prices so the
 * caller can see exactly which standard was applied.
 */

import { ApiError } from '../utils/apiError'
import { logger } from '../utils/logger'
import { zakatNisabRepository, type NisabRateRow } from '../repositories/zakatNisab.repository'
import { fetchLiveMetalPrices } from './marketPrices.service'

// ─── Islamic standard weights ─────────────────────────────────────────────────

const NISAB_GOLD_GRAMS   = 85    // grams — most contemporary scholars
const NISAB_SILVER_GRAMS = 595   // grams

// ─── Output shape ─────────────────────────────────────────────────────────────

export interface NisabRateResult {
  currency: string

  gold: {
    pricePerGram: number
    nisabWeightGrams: number        // always 85
    nisabValue: number              // price × 85
  }
  silver: {
    pricePerGram: number
    nisabWeightGrams: number        // always 595
    nisabValue: number              // price × 595
  }

  /** Which nisab threshold is lower — typically silver is the lower bound */
  lowerNisabValue: number

  /** ISO 8601 date-only string the rate is valid for — YYYY-MM-DD */
  effectiveDate: string

  /** Where the price data came from */
  source: string

  /** When this rate was fetched/stored — ISO 8601 timestamp */
  fetchedAt: string

  /** true when serving a previously cached row because today's live fetch failed */
  isStale: boolean

  /** If stale, how many calendar days old the cached data is */
  staleDays?: number
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const zakatNisabService = {
  /**
   * GET /api/v1/utilities/zakat/nisab-rate?currency=USD
   *
   * Returns today's Nisab rate. Cached once per day in PostgreSQL.
   * If the market API is unreachable, returns the latest valid cached row
   * with isStale=true and the staleDays count so the UI can warn the user.
   */
  getNisabRate: async (currency = 'USD'): Promise<NisabRateResult> => {
    const upperCurrency = currency.toUpperCase()

    // ── Step 1: Check if today's rate is already cached ──────────────────────
    const todayCached = await zakatNisabRepository.findTodayCached(upperCurrency)
    if (todayCached) {
      logger.info({ currency: upperCurrency }, '[ZakatNisab] Cache hit — returning today\'s cached rate')
      return toResult(todayCached, false)
    }

    // ── Step 2: No cache hit → try live market API ────────────────────────────
    logger.info({ currency: upperCurrency }, '[ZakatNisab] Cache miss — fetching live market price')
    const livePrice = await fetchLiveMetalPrices(upperCurrency)

    if (livePrice) {
      // ── Step 3: Compute Nisab values and persist to DB ────────────────────
      const nisabValueGold   = parseFloat((livePrice.goldPricePerGram   * NISAB_GOLD_GRAMS).toFixed(4))
      const nisabValueSilver = parseFloat((livePrice.silverPricePerGram * NISAB_SILVER_GRAMS).toFixed(4))

      try {
        const saved = await zakatNisabRepository.upsertRate({
          goldPricePerGram:   livePrice.goldPricePerGram,
          silverPricePerGram: livePrice.silverPricePerGram,
          currency:           upperCurrency,
          effectiveDate:      livePrice.fetchedAt,
          nisabGoldGrams:     NISAB_GOLD_GRAMS,
          nisabSilverGrams:   NISAB_SILVER_GRAMS,
          nisabValueGold,
          nisabValueSilver,
          source:             livePrice.source,
        })

        logger.info({ currency: upperCurrency, source: livePrice.source }, '[ZakatNisab] Live price fetched and cached')
        return toResult(saved, false)
      } catch (dbErr) {
        // DB write failed (e.g. connection loss) — return computed result without persistence
        logger.error({ err: (dbErr as Error).message }, '[ZakatNisab] Failed to persist rate — returning live price without cache')
        return buildResult(
          livePrice.goldPricePerGram,
          livePrice.silverPricePerGram,
          upperCurrency,
          livePrice.fetchedAt,
          livePrice.source,
          false,
        )
      }
    }

    // ── Step 4: API unavailable — try latest cached row ────────────────────
    logger.warn({ currency: upperCurrency }, '[ZakatNisab] Live price fetch failed — checking DB for latest cached row')
    const latestCached = await zakatNisabRepository.findLatestValid(upperCurrency)

    if (latestCached) {
      const staleDays = dateDiffDays(new Date(latestCached.effectiveDate), new Date())
      logger.warn({ currency: upperCurrency, staleDays }, '[ZakatNisab] Returning stale cached rate — no live price available')
      return toResult(latestCached, true, staleDays)
    }

    // ── Step 5: Absolutely nothing available ─────────────────────────────────
    throw ApiError.internal(
      'Nisab rate is currently unavailable. No live market price could be fetched and no cached rate exists. ' +
      'Configure GOLDAPI_KEY or METALPRICEAPI_KEY environment variables to enable live pricing.',
    )
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toResult(row: NisabRateRow, isStale: boolean, staleDays?: number): NisabRateResult {
  return buildResult(
    parseFloat(row.goldPricePerGram.toString()),
    parseFloat(row.silverPricePerGram.toString()),
    row.currency,
    row.effectiveDate,
    row.source ?? 'unknown',
    isStale,
    staleDays,
  )
}

function buildResult(
  goldPricePerGram: number,
  silverPricePerGram: number,
  currency: string,
  effectiveDate: Date,
  source: string,
  isStale: boolean,
  staleDays?: number,
): NisabRateResult {
  const nisabValueGold   = round4(goldPricePerGram   * NISAB_GOLD_GRAMS)
  const nisabValueSilver = round4(silverPricePerGram * NISAB_SILVER_GRAMS)
  const dateStr = effectiveDate.toISOString().split('T')[0] ?? effectiveDate.toISOString()

  return {
    currency,
    gold: {
      pricePerGram:     round4(goldPricePerGram),
      nisabWeightGrams: NISAB_GOLD_GRAMS,
      nisabValue:       nisabValueGold,
    },
    silver: {
      pricePerGram:     round6(silverPricePerGram),
      nisabWeightGrams: NISAB_SILVER_GRAMS,
      nisabValue:       nisabValueSilver,
    },
    lowerNisabValue: Math.min(nisabValueGold, nisabValueSilver),
    effectiveDate:   dateStr,
    source,
    fetchedAt:       new Date().toISOString(),
    isStale,
    ...(staleDays !== undefined ? { staleDays } : {}),
  }
}

function round4(n: number): number { return Math.round(n * 10000) / 10000 }
function round6(n: number): number { return Math.round(n * 1000000) / 1000000 }

function dateDiffDays(from: Date, to: Date): number {
  const msPerDay = 86_400_000
  const fromDay  = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const toDay    = Date.UTC(to.getUTCFullYear(),   to.getUTCMonth(),   to.getUTCDate())
  return Math.max(0, Math.round((toDay - fromDay) / msPerDay))
}

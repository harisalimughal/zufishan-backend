/**
 * Zakat Nisab Rate Service
 *
 * ─── Islamic Nisab Standards ───────────────────────────────────────────────────
 *
 * TWO recognised scholarly standards (both are valid; no "wrong" choice):
 *
 * 1. SOUTH_ASIAN (Default — Hanafi / Darul Uloom Deoband / Pakistan & India)
 *    Gold:   7.5 tola  = 87.48 g  (1 tola = 11.664 g)
 *    Silver: 52.5 tola = 612.36 g
 *    Reference: Darul Uloom Deoband fatwas; Darul Ifta, Pakistan
 *
 * 2. AAOIFI (International bodies — Islamic Fiqh Academy Makkah, some Arab countries)
 *    Gold:   85 g      (derived from 20 mithqal via Dr. Yusuf al-Qaradawi's calculation)
 *    Silver: 595 g     (derived from 200 dirhams @ 2.975 g each)
 *    Reference: AAOIFI Standard No. 9; Fatwa of Sheikh al-Qaradawi
 *
 * Practical rule: If a person possesses a mix of assets, many ulema advise using
 * SILVER nisab (which is lower), so that MORE people fulfil their Zakat obligation.
 *
 * ─── Responsibilities ──────────────────────────────────────────────────────────
 *   1. Check PostgreSQL cache for today's rate (one fetch per currency per day).
 *   2. On cache miss → call live market price API (GoldAPI.io → MetalPriceAPI fallback).
 *   3. Compute Nisab values using the configured methodology.
 *   4. Persist result to `zakat_nisab_rates` table.
 *   5. On API failure → return latest cached row with isStale=true + staleDays.
 *   6. If nothing available → throw ApiError.internal() — never silently use stale data.
 */

import { ApiError } from '../utils/apiError'
import { logger } from '../utils/logger'
import { zakatNisabRepository, type NisabRateRow } from '../repositories/zakatNisab.repository'
import { fetchLiveMetalPrices } from './marketPrices.service'

// ─── Nisab Methodology Definitions ────────────────────────────────────────────

export type NisabMethodology = 'SOUTH_ASIAN' | 'AAOIFI'

const NISAB_STANDARDS: Record<NisabMethodology, {
  goldGrams: number
  silverGrams: number
  goldTola: number
  silverTola: number
  description: string
  reference: string
}> = {
  SOUTH_ASIAN: {
    goldGrams:   87.48,   // 7.5 tola × 11.664 g/tola
    silverGrams: 612.36,  // 52.5 tola × 11.664 g/tola
    goldTola:    7.5,
    silverTola:  52.5,
    description: 'South Asian Hanafi standard (Darul Uloom Deoband, Pakistan, India, Bangladesh)',
    reference:   'Darul Uloom Deoband fatwas; 1 tola = 11.664 g',
  },
  AAOIFI: {
    goldGrams:   85,      // 20 mithqal — Qaradawi/AAOIFI
    silverGrams: 595,     // 200 dirhams @ 2.975 g
    goldTola:    7.29,    // approximate (85 / 11.664)
    silverTola:  51.0,    // approximate
    description: 'International AAOIFI / Islamic Fiqh Academy (Makkah) standard',
    reference:   'AAOIFI Sharia Standard No. 9; Dr. Yusuf al-Qaradawi',
  },
}

// Default methodology — South Asian Hanafi (Darul Uloom Deoband)
const DEFAULT_METHODOLOGY: NisabMethodology = 'SOUTH_ASIAN'

// ─── Output Shape ─────────────────────────────────────────────────────────────

export interface NisabRateResult {
  currency: string

  gold: {
    pricePerGram:     number
    nisabWeightGrams: number   // e.g. 87.48 (SOUTH_ASIAN) or 85 (AAOIFI)
    nisabWeightTola:  number   // e.g. 7.5
    nisabValue:       number   // price × nisabWeightGrams
  }
  silver: {
    pricePerGram:     number
    nisabWeightGrams: number   // e.g. 612.36 (SOUTH_ASIAN) or 595 (AAOIFI)
    nisabWeightTola:  number   // e.g. 52.5
    nisabValue:       number   // price × nisabWeightGrams
  }

  /** Lower of the two nisab values — scholars advise using this for mixed-asset Zakat eligibility */
  lowerNisabValue:    number

  methodology:        NisabMethodology
  methodologyDetails: {
    name:        string
    description: string
    reference:   string
  }

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
   * GET /api/v1/utilities/zakat/methodologies
   * Returns available Nisab standards and default methodology.
   */
  getMethodologies: () => {
    return {
      default: DEFAULT_METHODOLOGY,
      methodologies: NISAB_STANDARDS,
    }
  },

  /**
   * GET /api/v1/utilities/zakat/nisab-rate?currency=USD&methodology=SOUTH_ASIAN
   *
   * Returns today's Nisab rate. Cached once per day in PostgreSQL.
   * Methodology defaults to SOUTH_ASIAN (Darul Uloom Deoband — 7.5 tola gold, 52.5 tola silver).
   * If the market API is unreachable, returns the latest valid cached row with isStale=true.
   */
  getNisabRate: async (
    currency    = 'USD',
    methodology: NisabMethodology = DEFAULT_METHODOLOGY,
  ): Promise<NisabRateResult> => {
    const upperCurrency = currency.toUpperCase()
    const standard      = NISAB_STANDARDS[methodology]

    // ── Step 1: Check if today's rate is already cached ──────────────────────
    const todayCached = await zakatNisabRepository.findTodayCached(upperCurrency)
    if (todayCached) {
      logger.info({ currency: upperCurrency }, '[ZakatNisab] Cache hit — returning today\'s cached rate')
      return toResult(todayCached, standard, methodology, false)
    }

    // ── Step 2: No cache hit → try live market API ────────────────────────────
    logger.info({ currency: upperCurrency }, '[ZakatNisab] Cache miss — fetching live market price')
    const livePrice = await fetchLiveMetalPrices(upperCurrency)

    if (livePrice) {
      // ── Step 3: Compute Nisab values using the configured standard ─────────
      const nisabValueGold   = round4(livePrice.goldPricePerGram   * standard.goldGrams)
      const nisabValueSilver = round4(livePrice.silverPricePerGram * standard.silverGrams)

      try {
        const saved = await zakatNisabRepository.upsertRate({
          goldPricePerGram:   livePrice.goldPricePerGram,
          silverPricePerGram: livePrice.silverPricePerGram,
          currency:           upperCurrency,
          effectiveDate:      livePrice.fetchedAt,
          nisabGoldGrams:     standard.goldGrams,
          nisabSilverGrams:   standard.silverGrams,
          nisabValueGold,
          nisabValueSilver,
          source:             livePrice.source,
        })

        logger.info({ currency: upperCurrency, source: livePrice.source }, '[ZakatNisab] Live price fetched and cached')
        return toResult(saved, standard, methodology, false)
      } catch (dbErr) {
        // DB write failed — return computed result without persistence
        logger.error({ err: (dbErr as Error).message }, '[ZakatNisab] Failed to persist rate — returning live price without cache')
        return buildResult(
          livePrice.goldPricePerGram,
          livePrice.silverPricePerGram,
          upperCurrency,
          livePrice.fetchedAt,
          livePrice.source,
          standard,
          methodology,
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
      return toResult(latestCached, standard, methodology, true, staleDays)
    }

    // ── Step 5: Absolutely nothing available ─────────────────────────────────
    throw ApiError.internal(
      'Nisab rate is currently unavailable. No live market price could be fetched and no cached rate exists. ' +
      'Configure GOLDAPI_KEY or METALPRICEAPI_KEY environment variables to enable live pricing.',
    )
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type NisabStandard = typeof NISAB_STANDARDS[NisabMethodology]

function toResult(
  row:         NisabRateRow,
  standard:    NisabStandard,
  methodology: NisabMethodology,
  isStale:     boolean,
  staleDays?:  number,
): NisabRateResult {
  return buildResult(
    parseFloat(row.goldPricePerGram.toString()),
    parseFloat(row.silverPricePerGram.toString()),
    row.currency,
    row.effectiveDate,
    row.source ?? 'unknown',
    standard,
    methodology,
    isStale,
    staleDays,
  )
}

function buildResult(
  goldPricePerGram:   number,
  silverPricePerGram: number,
  currency:           string,
  effectiveDate:      Date,
  source:             string,
  standard:           NisabStandard,
  methodology:        NisabMethodology,
  isStale:            boolean,
  staleDays?:         number,
): NisabRateResult {
  const nisabValueGold   = round4(goldPricePerGram   * standard.goldGrams)
  const nisabValueSilver = round4(silverPricePerGram * standard.silverGrams)
  const dateStr = effectiveDate.toISOString().split('T')[0] ?? effectiveDate.toISOString()

  return {
    currency,
    gold: {
      pricePerGram:     round4(goldPricePerGram),
      nisabWeightGrams: standard.goldGrams,
      nisabWeightTola:  standard.goldTola,
      nisabValue:       nisabValueGold,
    },
    silver: {
      pricePerGram:     round6(silverPricePerGram),
      nisabWeightGrams: standard.silverGrams,
      nisabWeightTola:  standard.silverTola,
      nisabValue:       nisabValueSilver,
    },
    lowerNisabValue: Math.min(nisabValueGold, nisabValueSilver),
    methodology,
    methodologyDetails: {
      name:        methodology,
      description: standard.description,
      reference:   standard.reference,
    },
    effectiveDate: dateStr,
    source,
    fetchedAt:     new Date().toISOString(),
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

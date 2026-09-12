/**
 * Market Price Fetcher — Gold & Silver
 *
 * Approved source strategy (in priority order):
 *
 *   1. GoldAPI.io  — free tier, gold price in USD per troy oz
 *      GET https://www.goldapi.io/api/XAU/USD
 *      GET https://www.goldapi.io/api/XAG/USD
 *      Headers: x-access-token: <GOLDAPI_KEY>
 *      → Returns price per troy ounce in base currency.
 *
 *   2. MetalPriceAPI.com — free tier (100 req/month), via REST
 *      GET https://api.metalpriceapi.com/v1/latest?api_key=<KEY>&base=XAU&currencies=USD
 *
 *   3. Frankfurter (currency only) — if only FX rate is needed.
 *
 * Conversion constants:
 *   1 troy ounce = 31.1035 grams
 *
 * When NO API key is configured, the fetcher returns null and the service
 * falls back to the latest cached DB row (clearly flagged as stale).
 *
 * IMPORTANT: Prices are never hardcoded. If no live price can be obtained
 * and no cached row exists, the endpoint returns 503 with a clear message.
 */

import fetch from 'node-fetch'
import { logger } from '../utils/logger'
import { env } from '../config/env'

// ─── Constants ────────────────────────────────────────────────────────────────

const TROY_OZ_TO_GRAMS = 31.1035 // 1 troy ounce = 31.1035 g
const FETCH_TIMEOUT_MS = 8_000

// ─── Output type ─────────────────────────────────────────────────────────────

export interface LiveMetalPrices {
  goldPricePerGram: number    // USD (or requested currency) per gram
  silverPricePerGram: number
  currency: string
  source: string
  fetchedAt: Date
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

/**
 * Fetch live gold & silver prices per gram.
 * Returns null if no API key is set or all sources fail.
 * Never throws — always returns null on failure.
 */
export async function fetchLiveMetalPrices(currency = 'USD'): Promise<LiveMetalPrices | null> {
  const upperCurrency = currency.toUpperCase()

  // --- Strategy 1: GoldAPI.io (GOLDAPI_KEY env var) ---
  const goldApiKey = env.GOLDAPI_KEY
  if (goldApiKey) {
    const result = await tryGoldApi(goldApiKey, upperCurrency)
    if (result) return result
  }

  // --- Strategy 2: MetalPriceAPI.com (METALPRICEAPI_KEY env var) ---
  const metalKey = env.METALPRICEAPI_KEY
  if (metalKey) {
    const result = await tryMetalPriceApi(metalKey, upperCurrency)
    if (result) return result
  }

  logger.warn({ currency }, '[ZakatNisab] No API key configured or all market sources failed — will use cached rate')
  return null
}

// ─── GoldAPI.io ───────────────────────────────────────────────────────────────

async function tryGoldApi(apiKey: string, currency: string): Promise<LiveMetalPrices | null> {
  try {
    const [goldRes, silverRes] = await Promise.all([
      fetchWithTimeout(`https://www.goldapi.io/api/XAU/${currency}`, {
        headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' },
      }),
      fetchWithTimeout(`https://www.goldapi.io/api/XAG/${currency}`, {
        headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' },
      }),
    ])

    if (!goldRes.ok || !silverRes.ok) {
      logger.warn({ goldStatus: goldRes.status, silverStatus: silverRes.status }, '[ZakatNisab] GoldAPI returned non-200')
      return null
    }

    const goldJson = (await goldRes.json()) as Record<string, unknown>
    const silverJson = (await silverRes.json()) as Record<string, unknown>

    const goldPricePerOz = typeof goldJson['price'] === 'number' ? goldJson['price'] : null
    const silverPricePerOz = typeof silverJson['price'] === 'number' ? silverJson['price'] : null

    if (goldPricePerOz === null || silverPricePerOz === null) {
      logger.warn({ goldJson, silverJson }, '[ZakatNisab] GoldAPI returned unexpected shape')
      return null
    }

    return {
      goldPricePerGram:   goldPricePerOz / TROY_OZ_TO_GRAMS,
      silverPricePerGram: silverPricePerOz / TROY_OZ_TO_GRAMS,
      currency,
      source: 'goldapi.io',
      fetchedAt: new Date(),
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[ZakatNisab] GoldAPI fetch failed')
    return null
  }
}

// ─── MetalPriceAPI.com ────────────────────────────────────────────────────────

async function tryMetalPriceApi(apiKey: string, currency: string): Promise<LiveMetalPrices | null> {
  try {
    // MetalPriceAPI returns XAU = 1 troy oz of gold in USD, and rates relative to base
    const url =
      `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=${currency}&currencies=XAU,XAG`

    const res = await fetchWithTimeout(url)
    if (!res.ok) {
      logger.warn({ status: res.status }, '[ZakatNisab] MetalPriceAPI returned non-200')
      return null
    }

    const json = (await res.json()) as Record<string, unknown>
    if (!json['success']) {
      logger.warn({ json }, '[ZakatNisab] MetalPriceAPI returned success=false')
      return null
    }

    const rates = json['rates'] as Record<string, number> | undefined
    if (!rates || !rates['XAU'] || !rates['XAG']) {
      return null
    }

    // rates.XAU = how many XAU (troy oz) per 1 unit of `currency`
    // So price per troy oz in currency = 1 / rates.XAU
    const goldPricePerOz   = 1 / rates['XAU']
    const silverPricePerOz = 1 / rates['XAG']

    return {
      goldPricePerGram:   goldPricePerOz / TROY_OZ_TO_GRAMS,
      silverPricePerGram: silverPricePerOz / TROY_OZ_TO_GRAMS,
      currency,
      source: 'metalpriceapi.com',
      fetchedAt: new Date(),
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[ZakatNisab] MetalPriceAPI fetch failed')
    return null
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options?: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await (fetch as unknown as typeof globalThis.fetch)(url, {
      ...(options ?? {}),
      signal: controller.signal as AbortSignal,
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

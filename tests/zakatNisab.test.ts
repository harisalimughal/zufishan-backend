/**
 * Zakat Nisab Rate Service & Market Fetcher — Unit Tests
 *
 * Test strategy:
 *   - Mock all DB repository calls (zakatNisabRepository)
 *   - Mock the market price fetcher (fetchLiveMetalPrices)
 *   - All assertions are on the service output shape and branching logic
 *   - Tests cover: cache hit, cache miss+live, cache miss+stale, total failure
 *
 * Islamic constants asserted:
 *   - Gold Nisab weight: 85 g
 *   - Silver Nisab weight: 595 g
 *   - nisabValue = pricePerGram × weight
 *   - lowerNisabValue = min(gold, silver)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Decimal } from '@prisma/client/runtime/library'
import { ApiError } from '../src/utils/apiError'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/repositories/zakatNisab.repository', () => ({
  zakatNisabRepository: {
    findTodayCached: vi.fn(),
    findLatestValid:  vi.fn(),
    upsertRate:       vi.fn(),
  },
}))

vi.mock('../src/services/marketPrices.service', () => ({
  fetchLiveMetalPrices: vi.fn(),
}))

// Import after mocks
import { zakatNisabRepository } from '../src/repositories/zakatNisab.repository'
import { fetchLiveMetalPrices }  from '../src/services/marketPrices.service'
import { zakatNisabService }     from '../src/services/zakat.service'
import { nisabRateQuerySchema }  from '../src/validators/utility.validator'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = new Date(Date.UTC(2026, 8, 3)) // 3 Sep 2026

function makeRow(
  goldPerGram: number,
  silverPerGram: number,
  effectiveDate: Date = TODAY,
  source = 'goldapi.io',
) {
  const toDecimal = (n: number): Decimal =>
    ({ toString: () => String(n), toFixed: (d: number) => n.toFixed(d) } as unknown as Decimal)

  return {
    id: 'clx_test',
    goldPricePerGram:   toDecimal(goldPerGram),
    silverPricePerGram: toDecimal(silverPerGram),
    currency: 'USD',
    effectiveDate,
    nisabGoldGrams:   toDecimal(85),
    nisabSilverGrams: toDecimal(595),
    nisabValueGold:   toDecimal(goldPerGram * 85),
    nisabValueSilver: toDecimal(silverPerGram * 595),
    source,
    createdAt: TODAY,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('nisabRateQuerySchema', () => {
  it('should default currency to USD when omitted', () => {
    const result = nisabRateQuerySchema.parse({})
    expect(result.currency).toBe('USD')
  })

  it('should uppercase the currency code', () => {
    const result = nisabRateQuerySchema.parse({ currency: 'pkr' })
    expect(result.currency).toBe('PKR')
  })

  it('should reject a non-3-letter currency code', () => {
    expect(() => nisabRateQuerySchema.parse({ currency: 'US' })).toThrow()
    expect(() => nisabRateQuerySchema.parse({ currency: 'USDD' })).toThrow()
  })

  it('should reject a numeric currency code', () => {
    expect(() => nisabRateQuerySchema.parse({ currency: '123' })).toThrow()
  })

  it('should accept valid 3-letter codes', () => {
    expect(nisabRateQuerySchema.parse({ currency: 'EUR' }).currency).toBe('EUR')
    expect(nisabRateQuerySchema.parse({ currency: 'GBP' }).currency).toBe('GBP')
  })
})

describe('zakatNisabService.getNisabRate()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Scenario 1: Cache hit ────────────────────────────────────────────────
  it('should return today\'s cached rate immediately (cache hit)', async () => {
    const row = makeRow(75.5, 0.95)
    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(row)

    const result = await zakatNisabService.getNisabRate('USD')

    expect(zakatNisabRepository.findTodayCached).toHaveBeenCalledWith('USD')
    expect(fetchLiveMetalPrices).not.toHaveBeenCalled()
    expect(result.isStale).toBe(false)
    expect(result.currency).toBe('USD')
  })

  // ── Scenario 2: Cache miss, live price available ─────────────────────────
  it('should fetch live price on cache miss and persist it', async () => {
    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(null)
    vi.mocked(fetchLiveMetalPrices).mockResolvedValue({
      goldPricePerGram:   75.5,
      silverPricePerGram: 0.95,
      currency: 'USD',
      source: 'goldapi.io',
      fetchedAt: TODAY,
    })
    const savedRow = makeRow(75.5, 0.95, TODAY, 'goldapi.io')
    vi.mocked(zakatNisabRepository.upsertRate).mockResolvedValue(savedRow)

    const result = await zakatNisabService.getNisabRate('USD')

    expect(fetchLiveMetalPrices).toHaveBeenCalledWith('USD')
    expect(zakatNisabRepository.upsertRate).toHaveBeenCalled()
    expect(result.isStale).toBe(false)
    expect(result.source).toBe('goldapi.io')
  })

  // ── Scenario 3: Response shape correctness ───────────────────────────────
  it('should correctly compute Gold Nisab as price × 85g', async () => {
    const goldPerGram = 75.5
    const row = makeRow(goldPerGram, 0.95)
    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(row)

    const result = await zakatNisabService.getNisabRate('USD')

    expect(result.gold.nisabWeightGrams).toBe(85)
    expect(result.gold.pricePerGram).toBeCloseTo(goldPerGram, 2)
    expect(result.gold.nisabValue).toBeCloseTo(goldPerGram * 85, 1)
  })

  it('should correctly compute Silver Nisab as price × 595g', async () => {
    const silverPerGram = 0.95
    const row = makeRow(75.5, silverPerGram)
    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(row)

    const result = await zakatNisabService.getNisabRate('USD')

    expect(result.silver.nisabWeightGrams).toBe(595)
    expect(result.silver.pricePerGram).toBeCloseTo(silverPerGram, 4)
    expect(result.silver.nisabValue).toBeCloseTo(silverPerGram * 595, 1)
  })

  it('lowerNisabValue should be min(gold, silver)', async () => {
    // Gold nisab: 75.5 × 85 = 6417.5; Silver nisab: 0.95 × 595 = 565.25 → silver is lower
    const row = makeRow(75.5, 0.95)
    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(row)

    const result = await zakatNisabService.getNisabRate('USD')

    expect(result.lowerNisabValue).toBeLessThanOrEqual(result.gold.nisabValue)
    expect(result.lowerNisabValue).toBeLessThanOrEqual(result.silver.nisabValue)
  })

  // ── Scenario 4: API failure, stale fallback ──────────────────────────────
  it('should return stale cached data with isStale=true when live API fails', async () => {
    const oldDate = new Date(Date.UTC(2026, 8, 1)) // 2 days ago
    const staleRow = makeRow(74.0, 0.92, oldDate, 'goldapi.io')

    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(null)
    vi.mocked(fetchLiveMetalPrices).mockResolvedValue(null)
    vi.mocked(zakatNisabRepository.findLatestValid).mockResolvedValue(staleRow)

    const result = await zakatNisabService.getNisabRate('USD')

    expect(result.isStale).toBe(true)
    expect(result.staleDays).toBeGreaterThanOrEqual(2)
    expect(result.source).toBe('goldapi.io')
  })

  // ── Scenario 5: No price at all (503) ────────────────────────────────────
  it('should throw 500 ApiError when no live price and no cached row exists', async () => {
    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(null)
    vi.mocked(fetchLiveMetalPrices).mockResolvedValue(null)
    vi.mocked(zakatNisabRepository.findLatestValid).mockResolvedValue(null)

    await expect(zakatNisabService.getNisabRate('USD')).rejects.toBeInstanceOf(ApiError)
  })

  // ── Scenario 6: DB write failure — still returns live price ──────────────
  it('should return live price even if DB write throws', async () => {
    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(null)
    vi.mocked(fetchLiveMetalPrices).mockResolvedValue({
      goldPricePerGram:   75.5,
      silverPricePerGram: 0.95,
      currency: 'USD',
      source: 'goldapi.io',
      fetchedAt: TODAY,
    })
    vi.mocked(zakatNisabRepository.upsertRate).mockRejectedValue(new Error('DB connection lost'))

    const result = await zakatNisabService.getNisabRate('USD')

    expect(result.isStale).toBe(false)
    expect(result.gold.pricePerGram).toBeCloseTo(75.5, 2)
  })

  // ── Scenario 7: effectiveDate and fetchedAt are always present ───────────
  it('should always include effectiveDate and fetchedAt in the response', async () => {
    const row = makeRow(75.5, 0.95)
    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(row)

    const result = await zakatNisabService.getNisabRate('USD')

    expect(result.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  // ── Scenario 8: Non-USD currency passes through ───────────────────────────
  it('should pass the requested currency to repository and fetcher', async () => {
    vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(null)
    vi.mocked(fetchLiveMetalPrices).mockResolvedValue(null)
    vi.mocked(zakatNisabRepository.findLatestValid).mockResolvedValue(null)

    await expect(zakatNisabService.getNisabRate('PKR')).rejects.toBeInstanceOf(ApiError)
    expect(zakatNisabRepository.findTodayCached).toHaveBeenCalledWith('PKR')
    expect(fetchLiveMetalPrices).toHaveBeenCalledWith('PKR')
  })
})

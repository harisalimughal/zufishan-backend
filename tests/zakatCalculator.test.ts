/**
 * Zakat Calculation Engine — Unit Tests
 *
 * Covers: normal paths, zero values, nisāb boundaries, invalid assets,
 * agricultural/livestock rules, madhab metadata, and large-value precision.
 *
 * No network / DB — pure calculator + Zod schema + zakatRules helpers.
 */

import { describe, it, expect } from 'vitest'
import { zakatCalculatorService } from '../src/services/zakatCalculator.service'
import {
  sheepGoatsDue,
  cattleDue,
  camelsDue,
  getAgriculturalRate,
  getWealthRate,
  WEALTH_ZAKAT_RATE,
} from '../src/services/zakatRules'
import { zakatCalculateSchema } from '../src/validators/utility.validator'
import { ApiError } from '../src/utils/apiError'
import {
  moneyAdd,
  moneyMul,
  moneyPercent,
  moneyToNumber,
  toMoney,
} from '../src/utils/money'

// ─── money utils ──────────────────────────────────────────────────────────────

describe('money utils (precise arithmetic)', () => {
  it('adds without float drift (0.1 + 0.2)', () => {
    const sum = moneyAdd(0.1, 0.2)
    expect(moneyToNumber(sum)).toBe(0.3)
  })

  it('computes 2.5% of 10000 exactly as 250', () => {
    expect(moneyToNumber(moneyPercent(10000, WEALTH_ZAKAT_RATE))).toBe(250)
  })

  it('handles large values without precision loss at MONEY_SCALE', () => {
    const large = '999999999999.1234'
    const result = moneyMul(large, WEALTH_ZAKAT_RATE)
    // 999999999999.1234 * 0.025 = 24999999999.978085 → rounded to 4 dp
    expect(moneyToNumber(result)).toBe(24999999999.9781)
  })

  it('rejects non-finite numbers', () => {
    expect(() => toMoney(Number.NaN)).toThrow(/Invalid money value/)
    expect(() => toMoney(Number.POSITIVE_INFINITY)).toThrow(/Invalid money value/)
  })
})

// ─── zakatRules helpers ───────────────────────────────────────────────────────

describe('zakatRules — wealth & agricultural rates', () => {
  it('wealth rate is 2.5% for every madhab', () => {
    for (const madhab of ['hanafi', 'shafi', 'maliki', 'hanbali'] as const) {
      const rule = getWealthRate(madhab)
      expect(rule.rate).toBe('0.025')
      expect(rule.ratePercentage).toBe(2.5)
    }
  })

  it('agricultural natural → 10%, artificial → 5%, mixed → 7.5%', () => {
    expect(getAgriculturalRate('hanafi', 'natural').ratePercentage).toBe(10)
    expect(getAgriculturalRate('shafi', 'artificial').ratePercentage).toBe(5)
    expect(getAgriculturalRate('maliki', 'mixed').ratePercentage).toBe(7.5)
  })
})

describe('zakatRules — livestock tables', () => {
  it('sheep/goats: below 40 → 0', () => {
    expect(sheepGoatsDue(0).animalsDue).toBe(0)
    expect(sheepGoatsDue(39).animalsDue).toBe(0)
  })

  it('sheep/goats: boundary 40 → 1, 120 → 1, 121 → 2', () => {
    expect(sheepGoatsDue(40).animalsDue).toBe(1)
    expect(sheepGoatsDue(120).animalsDue).toBe(1)
    expect(sheepGoatsDue(121).animalsDue).toBe(2)
    expect(sheepGoatsDue(200).animalsDue).toBe(2)
    expect(sheepGoatsDue(201).animalsDue).toBe(3)
  })

  it('sheep/goats: 400 → 4 (1 per 100)', () => {
    expect(sheepGoatsDue(400).animalsDue).toBe(4)
    expect(sheepGoatsDue(499).animalsDue).toBe(4)
    expect(sheepGoatsDue(500).animalsDue).toBe(5)
  })

  it('cattle: below 30 → 0, 30 → 1 tabīʿ, 40 → 1 musinnah', () => {
    expect(cattleDue(29).animalsDue).toBe(0)
    expect(cattleDue(30).animalsDue).toBe(1)
    expect(cattleDue(30).dueUnit).toBe('cattle_tabee')
    expect(cattleDue(40).dueUnit).toBe('cattle_musinnah')
  })

  it('camels: below 5 → 0, 5 → 1 sheep, 25 → bint makhāḍ', () => {
    expect(camelsDue(4).animalsDue).toBe(0)
    expect(camelsDue(5).animalsDue).toBe(1)
    expect(camelsDue(5).dueUnit).toBe('goat_or_sheep')
    expect(camelsDue(25).dueUnit).toBe('camel_bint_makhad')
  })

  it('camels > 75: does not invent combination table (animalsDue 0 + explicit note)', () => {
    const due = camelsDue(80)
    expect(due.animalsDue).toBe(0)
    expect(due.explanation).toMatch(/does not invent/i)
  })
})

// ─── Zod schema validation ────────────────────────────────────────────────────

describe('zakatCalculateSchema', () => {
  it('accepts a minimal valid payload', () => {
    const parsed = zakatCalculateSchema.parse({
      assets: [{ category: 'cash', value: 1000 }],
      madhab: 'hanafi',
    })
    expect(parsed.currency).toBe('USD')
    expect(parsed.assets).toHaveLength(1)
  })

  it('rejects empty assets array', () => {
    expect(() =>
      zakatCalculateSchema.parse({ assets: [], madhab: 'hanafi' }),
    ).toThrow()
  })

  it('rejects unknown category', () => {
    expect(() =>
      zakatCalculateSchema.parse({
        assets: [{ category: 'crypto', value: 1 }],
        madhab: 'hanafi',
      }),
    ).toThrow()
  })

  it('rejects unknown madhab', () => {
    expect(() =>
      zakatCalculateSchema.parse({
        assets: [{ category: 'cash', value: 1 }],
        madhab: 'jaafari',
      }),
    ).toThrow()
  })

  it('rejects negative value', () => {
    expect(() =>
      zakatCalculateSchema.parse({
        assets: [{ category: 'cash', value: -1 }],
        madhab: 'hanafi',
      }),
    ).toThrow()
  })

  it('rejects agricultural_produce without irrigation', () => {
    expect(() =>
      zakatCalculateSchema.parse({
        assets: [{ category: 'agricultural_produce', value: 1000 }],
        madhab: 'hanafi',
      }),
    ).toThrow(/irrigation/i)
  })

  it('rejects livestock without animalType / headCount', () => {
    expect(() =>
      zakatCalculateSchema.parse({
        assets: [{ category: 'livestock', value: 5000 }],
        madhab: 'hanafi',
      }),
    ).toThrow()
  })

  it('accepts livestock with animalType + headCount', () => {
    const parsed = zakatCalculateSchema.parse({
      assets: [
        {
          category: 'livestock',
          value: 8000,
          animalType: 'sheep_goats',
          headCount: 40,
        },
      ],
      madhab: 'shafi',
    })
    expect(parsed.assets[0]!.headCount).toBe(40)
  })

  it('uppercases currency', () => {
    const parsed = zakatCalculateSchema.parse({
      assets: [{ category: 'cash', value: 1 }],
      madhab: 'maliki',
      currency: 'pkr',
    })
    expect(parsed.currency).toBe('PKR')
  })
})

// ─── Calculator — normal paths ────────────────────────────────────────────────

describe('zakatCalculatorService.calculate() — normal', () => {
  it('calculates 2.5% on cash', () => {
    const result = zakatCalculatorService.calculate({
      assets: [{ category: 'cash', value: 10_000 }],
      madhab: 'hanafi',
    })
    expect(result.totalZakat).toBe(250)
    expect(result.categorySubtotals.cash).toBe(10_000)
    expect(result.madhab).toBe('hanafi')
    expect(result.wealthMeetsNisab).toBeNull()
  })

  it('sums multiple wealth categories and applies 2.5%', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        { category: 'cash', value: 5_000 },
        { category: 'gold_silver', value: 3_000 },
        { category: 'business_inventory', value: 1_000 },
        { category: 'investments', value: 1_000 },
      ],
      madhab: 'shafi',
      nisabThreshold: 500,
    })
    expect(result.totalWealthAssets).toBe(10_000)
    expect(result.totalZakat).toBe(250)
    expect(result.wealthMeetsNisab).toBe(true)
    expect(result.categoryBreakdown).toHaveLength(4)
  })

  it('aggregates duplicate category lines into one subtotal', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        { category: 'cash', value: 100 },
        { category: 'cash', value: 200.5 },
      ],
      madhab: 'hanafi',
    })
    expect(result.categorySubtotals.cash).toBe(300.5)
    expect(result.totalZakat).toBe(moneyToNumber(moneyPercent(300.5, '0.025')))
  })

  it('applies 10% on naturally irrigated produce', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        {
          category: 'agricultural_produce',
          value: 2_000,
          irrigation: 'natural',
        },
      ],
      madhab: 'hanafi',
    })
    expect(result.totalZakat).toBe(200)
    const row = result.categoryBreakdown[0]!
    expect(row.ratePercentage).toBe(10)
    expect(row.isDue).toBe(true)
  })

  it('applies 5% on artificially irrigated produce', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        {
          category: 'agricultural_produce',
          value: 2_000,
          irrigation: 'artificial',
        },
      ],
      madhab: 'maliki',
    })
    expect(result.totalZakat).toBe(100)
  })

  it('applies 7.5% on mixed irrigation produce', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        {
          category: 'agricultural_produce',
          value: 2_000,
          irrigation: 'mixed',
        },
      ],
      madhab: 'hanbali',
    })
    expect(result.totalZakat).toBe(150)
  })

  it('sums per-line agricultural rates when irrigation methods differ', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        { category: 'agricultural_produce', value: 1_000, irrigation: 'natural' },
        { category: 'agricultural_produce', value: 1_000, irrigation: 'artificial' },
      ],
      madhab: 'hanafi',
    })
    // 10% of 1000 + 5% of 1000 = 100 + 50 = 150
    expect(result.totalZakat).toBe(150)
    expect(result.categorySubtotals.agricultural_produce).toBe(2_000)
  })

  it('computes livestock monetary equivalent from headcount table', () => {
    // 40 sheep, herd value 8000 → 1 sheep due → (1/40)*8000 = 200
    const result = zakatCalculatorService.calculate({
      assets: [
        {
          category: 'livestock',
          value: 8_000,
          animalType: 'sheep_goats',
          headCount: 40,
        },
      ],
      madhab: 'hanafi',
    })
    expect(result.totalZakat).toBe(200)
    const row = result.categoryBreakdown[0]!
    expect(row.livestock?.animalsDue).toBe(1)
    expect(row.notes.some((n) => /Monetary equivalent/i.test(n))).toBe(true)
  })

  it('returns madhab inclusion notes and disclaimer', () => {
    const result = zakatCalculatorService.calculate({
      assets: [{ category: 'cash', value: 100 }],
      madhab: 'hanafi',
    })
    expect(result.madhabDetails.inclusionNotes.length).toBeGreaterThan(0)
    expect(result.disclaimer).toMatch(/not a fatwa/i)
  })

  it('combines wealth + agricultural in totalZakat', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        { category: 'cash', value: 4_000 },
        { category: 'agricultural_produce', value: 1_000, irrigation: 'natural' },
      ],
      madhab: 'hanafi',
      nisabThreshold: 100,
    })
    // wealth 2.5% of 4000 = 100; agri 10% of 1000 = 100; total 200
    expect(result.totalZakat).toBe(200)
    expect(result.totalAssets).toBe(5_000)
  })
})

// ─── Zero / boundary ──────────────────────────────────────────────────────────

describe('zakatCalculatorService.calculate() — zero & boundary', () => {
  it('zero-value cash → zakat 0, isDue false', () => {
    const result = zakatCalculatorService.calculate({
      assets: [{ category: 'cash', value: 0 }],
      madhab: 'hanafi',
    })
    expect(result.totalZakat).toBe(0)
    expect(result.categoryBreakdown[0]!.isDue).toBe(false)
  })

  it('wealth exactly at nisāb → zakat due', () => {
    const result = zakatCalculatorService.calculate({
      assets: [{ category: 'cash', value: 1_000 }],
      madhab: 'hanafi',
      nisabThreshold: 1_000,
    })
    expect(result.wealthMeetsNisab).toBe(true)
    expect(result.totalZakat).toBe(25)
  })

  it('wealth just below nisāb → wealth zakat zeroed', () => {
    const result = zakatCalculatorService.calculate({
      assets: [{ category: 'cash', value: 999.99 }],
      madhab: 'hanafi',
      nisabThreshold: 1_000,
    })
    expect(result.wealthMeetsNisab).toBe(false)
    expect(result.totalZakat).toBe(0)
    expect(result.categoryBreakdown[0]!.notes.join(' ')).toMatch(/below/i)
  })

  it('agricultural zakat is NOT gated by wealth nisāb', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        { category: 'cash', value: 10 },
        { category: 'agricultural_produce', value: 1_000, irrigation: 'natural' },
      ],
      madhab: 'hanafi',
      nisabThreshold: 10_000,
    })
    // cash below nisab → 0; agri still 100
    expect(result.wealthMeetsNisab).toBe(false)
    expect(result.totalZakat).toBe(100)
  })

  it('sheep headCount 39 → 0 animals due → zakat 0', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        {
          category: 'livestock',
          value: 5_000,
          animalType: 'sheep_goats',
          headCount: 39,
        },
      ],
      madhab: 'hanafi',
    })
    expect(result.totalZakat).toBe(0)
    expect(result.categoryBreakdown[0]!.livestock?.animalsDue).toBe(0)
  })

  it('sheep headCount exactly 40 → 1 animal due', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        {
          category: 'livestock',
          value: 4_000,
          animalType: 'sheep_goats',
          headCount: 40,
        },
      ],
      madhab: 'hanafi',
    })
    expect(result.totalZakat).toBe(100) // 1/40 * 4000
  })

  it('nisabThreshold 0 treats any positive wealth as meeting nisāb', () => {
    const result = zakatCalculatorService.calculate({
      assets: [{ category: 'investments', value: 0.04 }],
      madhab: 'hanafi',
      nisabThreshold: 0,
    })
    expect(result.wealthMeetsNisab).toBe(true)
    expect(result.totalZakat).toBe(moneyToNumber(moneyPercent(0.04, '0.025')))
  })
})

// ─── Invalid ──────────────────────────────────────────────────────────────────

describe('zakatCalculatorService.calculate() — invalid', () => {
  it('throws on empty assets', () => {
    expect(() =>
      zakatCalculatorService.calculate({ assets: [], madhab: 'hanafi' }),
    ).toThrow(ApiError)
  })

  it('throws when agricultural lacks irrigation', () => {
    expect(() =>
      zakatCalculatorService.calculate({
        assets: [{ category: 'agricultural_produce', value: 100 }],
        madhab: 'hanafi',
      }),
    ).toThrow(/irrigation/i)
  })

  it('throws when livestock lacks animalType', () => {
    expect(() =>
      zakatCalculatorService.calculate({
        assets: [{ category: 'livestock', value: 100, headCount: 40 }],
        madhab: 'hanafi',
      }),
    ).toThrow(/animalType/i)
  })

  it('throws when livestock lacks headCount', () => {
    expect(() =>
      zakatCalculatorService.calculate({
        assets: [
          { category: 'livestock', value: 100, animalType: 'cattle' },
        ],
        madhab: 'hanafi',
      }),
    ).toThrow(/headCount/i)
  })

  it('throws on negative value', () => {
    expect(() =>
      zakatCalculatorService.calculate({
        assets: [{ category: 'cash', value: -5 }],
        madhab: 'hanafi',
      }),
    ).toThrow(/≥ 0/)
  })

  it('throws on NaN value', () => {
    expect(() =>
      zakatCalculatorService.calculate({
        assets: [{ category: 'cash', value: Number.NaN }],
        madhab: 'hanafi',
      }),
    ).toThrow(/finite/)
  })

  it('refuses camel herds above 75 without inventing a ruling', () => {
    expect(() =>
      zakatCalculatorService.calculate({
        assets: [
          {
            category: 'livestock',
            value: 100_000,
            animalType: 'camels',
            headCount: 80,
          },
        ],
        madhab: 'hanafi',
      }),
    ).toThrow(/does not invent/i)
  })
})

// ─── Large values ─────────────────────────────────────────────────────────────

describe('zakatCalculatorService.calculate() — large values', () => {
  it('handles multi-billion wealth without float error', () => {
    const value = 1_000_000_000.12
    const result = zakatCalculatorService.calculate({
      assets: [{ category: 'cash', value }],
      madhab: 'hanafi',
      nisabThreshold: 500,
    })
    const expected = moneyToNumber(moneyPercent(value, '0.025'))
    expect(result.totalZakat).toBe(expected)
    expect(result.totalZakat).toBe(25_000_000.003)
  })

  it('sums many line items precisely', () => {
    const assets = Array.from({ length: 100 }, () => ({
      category: 'cash' as const,
      value: 0.1,
    }))
    const result = zakatCalculatorService.calculate({
      assets,
      madhab: 'shafi',
    })
    // 100 * 0.1 = 10 exactly with Decimal; 2.5% = 0.25
    expect(result.categorySubtotals.cash).toBe(10)
    expect(result.totalZakat).toBe(0.25)
  })

  it('large agricultural produce at 10%', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        {
          category: 'agricultural_produce',
          value: 50_000_000,
          irrigation: 'natural',
        },
      ],
      madhab: 'hanafi',
    })
    expect(result.totalZakat).toBe(5_000_000)
  })
})

// ─── Transparency / breakdown shape ───────────────────────────────────────────

describe('zakatCalculatorService.calculate() — breakdown transparency', () => {
  it('exposes inputs summary and category subtotals for all categories', () => {
    const result = zakatCalculatorService.calculate({
      assets: [
        { category: 'cash', value: 100 },
        { category: 'investments', value: 200 },
      ],
      madhab: 'hanbali',
      currency: 'GBP',
      nisabThreshold: 50,
    })

    expect(result.currency).toBe('GBP')
    expect(result.inputs.assetCount).toBe(2)
    expect(result.inputs.nisabCheckApplied).toBe(true)
    expect(result.inputs.categoriesPresent).toEqual(['cash', 'investments'])
    expect(result.categorySubtotals).toMatchObject({
      cash: 100,
      gold_silver: 0,
      business_inventory: 0,
      agricultural_produce: 0,
      livestock: 0,
      investments: 200,
    })
    for (const row of result.categoryBreakdown) {
      expect(row).toHaveProperty('reference')
      expect(row).toHaveProperty('notes')
      expect(row).toHaveProperty('rateLabel')
    }
  })

  it('notes when nisāb check was skipped', () => {
    const result = zakatCalculatorService.calculate({
      assets: [{ category: 'business_inventory', value: 500 }],
      madhab: 'hanafi',
    })
    expect(result.inputs.nisabCheckApplied).toBe(false)
    expect(result.categoryBreakdown[0]!.notes.join(' ')).toMatch(/not provided/i)
  })
})

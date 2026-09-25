/**
 * Zakat Calculation Engine
 *
 * Pure, side-effect-free service: validates assets, applies configured madhab
 * rules from `zakatRules.ts`, and returns a transparent breakdown.
 *
 * Never persists data, never fetches market prices, never invents undocumented
 * religious rulings — see zakatRules.ts for sourced rates and explicit gaps.
 */

import { ApiError } from '../utils/apiError'
import {
  moneyAdd,
  moneyDiv,
  moneyGte,
  moneyIsZero,
  moneyMul,
  moneyPercent,
  moneyToNumber,
  rateToNumber,
  toMoney,
} from '../utils/money'
import {
  getAgriculturalRate,
  getLivestockDue,
  getMadhabProfile,
  getWealthRate,
  WEALTH_CATEGORIES,
  type IrrigationMethod,
  type LivestockAnimalType,
  type Madhab,
  type ZakatAssetCategory,
} from './zakatRules'
import type { Decimal } from '@prisma/client/runtime/library'

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface ZakatAssetInput {
  category: ZakatAssetCategory
  /** Monetary value in the request currency (market value). */
  value: number
  /** Required for agricultural_produce. */
  irrigation?: IrrigationMethod
  /** Required for livestock (together with headCount). */
  animalType?: LivestockAnimalType
  /** Required for livestock — classical tables are headcount-based. */
  headCount?: number
}

export interface ZakatCalculateInput {
  assets: ZakatAssetInput[]
  madhab: Madhab
  /**
   * Optional nisāb threshold in the same currency.
   * When provided, wealth-category zakat is only marked due if total wealth ≥ nisāb.
   * Agricultural / livestock obligations are evaluated independently of this figure.
   */
  nisabThreshold?: number
  currency?: string
}

export interface CategoryBreakdown {
  category: ZakatAssetCategory
  /** Sum of asset values in this category. */
  subtotal: number
  /** Number of asset line items rolled into this category. */
  assetCount: number
  /** Rate applied as a fraction (0 if none / not applicable). */
  rate: number
  ratePercentage: number
  rateLabel: string
  /** Zakat amount for this category (0 if not due / below nisāb gate). */
  zakatDue: number
  /** True when this category contributed a positive zakat amount. */
  isDue: boolean
  notes: string[]
  reference: string
  /** Livestock-only detail when headcount tables were used. */
  livestock?: {
    animalType: LivestockAnimalType
    headCount: number
    animalsDue: number
    dueUnit: string
  }
}

export interface ZakatCalculateResult {
  madhab: Madhab
  madhabDetails: {
    name: string
    description: string
    inclusionNotes: string[]
    references: string[]
  }
  currency: string

  inputs: {
    assetCount: number
    categoriesPresent: ZakatAssetCategory[]
    nisabThreshold: number | null
    nisabCheckApplied: boolean
  }

  categoryBreakdown: CategoryBreakdown[]
  categorySubtotals: Record<ZakatAssetCategory, number>

  /** Sum of all asset monetary values. */
  totalAssets: number
  /** Sum of wealth-category values (cash, gold_silver, business, investments). */
  totalWealthAssets: number
  /** Sum of zakat across all categories that are due. */
  totalZakat: number

  /**
   * For wealth categories only:
   *   true  — totalWealthAssets ≥ nisabThreshold
   *   false — below nisāb (wealth zakat zeroed)
   *   null  — nisāb not supplied; wealth zakat still computed, obligation unchecked
   */
  wealthMeetsNisab: boolean | null

  disclaimer: string
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const zakatCalculatorService = {
  /**
   * Calculate Zakat for a validated request body.
   * Throws ApiError.badRequest on rule-level validation failures
   * (category-specific required fields, unsupported livestock ranges, etc.).
   */
  calculate(input: ZakatCalculateInput): ZakatCalculateResult {
    const { assets, madhab } = input
    const currency = (input.currency ?? 'USD').toUpperCase()
    const profile = getMadhabProfile(madhab)

    if (!assets || assets.length === 0) {
      throw ApiError.badRequest('At least one asset is required')
    }

    // Validate every asset before any arithmetic
    assets.forEach((asset, index) => validateAsset(asset, index))

    const nisabThreshold =
      input.nisabThreshold !== undefined ? toMoney(input.nisabThreshold) : null
    const nisabCheckApplied = nisabThreshold !== null

    // Group by category
    const grouped = groupByCategory(assets)

    const wealthRate = getWealthRate(madhab)
    let totalWealth = toMoney(0)

    for (const cat of WEALTH_CATEGORIES) {
      const items = grouped.get(cat) ?? []
      for (const item of items) {
        totalWealth = moneyAdd(totalWealth, item.value)
      }
    }

    let wealthMeetsNisab: boolean | null = null
    if (nisabThreshold !== null) {
      wealthMeetsNisab = moneyGte(totalWealth, nisabThreshold)
    }

    const categoryBreakdown: CategoryBreakdown[] = []
    const categorySubtotals = emptySubtotals()
    let totalAssets = toMoney(0)
    let totalZakat = toMoney(0)

    const categoriesPresent = [...grouped.keys()].sort() as ZakatAssetCategory[]

    for (const category of categoriesPresent) {
      const items = grouped.get(category)!
      const subtotal = items.reduce(
        (sum, a) => moneyAdd(sum, a.value),
        toMoney(0),
      )
      categorySubtotals[category] = moneyToNumber(subtotal)
      totalAssets = moneyAdd(totalAssets, subtotal)

      const breakdown = computeCategoryZakat({
        category,
        items,
        subtotal,
        madhab,
        wealthRate,
        wealthMeetsNisab,
        nisabCheckApplied,
      })

      categoryBreakdown.push(breakdown)
      if (breakdown.isDue) {
        totalZakat = moneyAdd(totalZakat, breakdown.zakatDue)
      }
    }

    // Ensure every present category appears; also fill zeroes for absent ones
    // only in categorySubtotals (already initialised to 0).

    return {
      madhab,
      madhabDetails: {
        name: profile.name,
        description: profile.description,
        inclusionNotes: profile.inclusionNotes,
        references: profile.references,
      },
      currency,
      inputs: {
        assetCount: assets.length,
        categoriesPresent,
        nisabThreshold:
          nisabThreshold !== null ? moneyToNumber(nisabThreshold) : null,
        nisabCheckApplied,
      },
      categoryBreakdown,
      categorySubtotals,
      totalAssets: moneyToNumber(totalAssets),
      totalWealthAssets: moneyToNumber(totalWealth),
      totalZakat: moneyToNumber(totalZakat),
      wealthMeetsNisab,
      disclaimer:
        'This calculation applies documented classical rates configured for the selected madhab. ' +
        'It is an educational estimate, not a fatwa. Confirm edge cases (ḥawl, debts, jewellery, ' +
        'large livestock herds, mixed produce) with a qualified scholar.',
    }
  },
}

// ─── Internals ────────────────────────────────────────────────────────────────

function emptySubtotals(): Record<ZakatAssetCategory, number> {
  return {
    cash: 0,
    gold_silver: 0,
    business_inventory: 0,
    agricultural_produce: 0,
    livestock: 0,
    investments: 0,
  }
}

function groupByCategory(
  assets: ZakatAssetInput[],
): Map<ZakatAssetCategory, ZakatAssetInput[]> {
  const map = new Map<ZakatAssetCategory, ZakatAssetInput[]>()
  for (const asset of assets) {
    const list = map.get(asset.category) ?? []
    list.push(asset)
    map.set(asset.category, list)
  }
  return map
}

function validateAsset(asset: ZakatAssetInput, index: number): void {
  const label = `assets[${index}]`

  if (asset.value === undefined || asset.value === null) {
    throw ApiError.badRequest(`${label}.value is required`)
  }
  if (typeof asset.value !== 'number' || !Number.isFinite(asset.value)) {
    throw ApiError.badRequest(`${label}.value must be a finite number`)
  }
  if (asset.value < 0) {
    throw ApiError.badRequest(`${label}.value must be ≥ 0`)
  }

  if (asset.category === 'agricultural_produce') {
    if (!asset.irrigation) {
      throw ApiError.badRequest(
        `${label}: agricultural_produce requires "irrigation" ` +
          '("natural" | "artificial" | "mixed") — rate cannot be invented without it',
      )
    }
  }

  if (asset.category === 'livestock') {
    if (!asset.animalType) {
      throw ApiError.badRequest(
        `${label}: livestock requires "animalType" ` +
          '("camels" | "cattle" | "sheep_goats") — classical zakat is not a flat % of market value',
      )
    }
    if (asset.headCount === undefined || asset.headCount === null) {
      throw ApiError.badRequest(
        `${label}: livestock requires "headCount" — classical tables are headcount-based`,
      )
    }
    if (!Number.isInteger(asset.headCount) || asset.headCount < 0) {
      throw ApiError.badRequest(`${label}.headCount must be an integer ≥ 0`)
    }
  }
}

function computeCategoryZakat(args: {
  category: ZakatAssetCategory
  items: ZakatAssetInput[]
  subtotal: Decimal
  madhab: Madhab
  wealthRate: ReturnType<typeof getWealthRate>
  wealthMeetsNisab: boolean | null
  nisabCheckApplied: boolean
}): CategoryBreakdown {
  const { category, items, subtotal, madhab, wealthRate, wealthMeetsNisab, nisabCheckApplied } =
    args

  if (WEALTH_CATEGORIES.has(category)) {
    return computeWealthCategory({
      category,
      items,
      subtotal,
      wealthRate,
      wealthMeetsNisab,
      nisabCheckApplied,
    })
  }

  if (category === 'agricultural_produce') {
    return computeAgriculturalCategory({ items, subtotal, madhab })
  }

  // livestock
  return computeLivestockCategory({ items, subtotal })
}

function computeWealthCategory(args: {
  category: ZakatAssetCategory
  items: ZakatAssetInput[]
  subtotal: Decimal
  wealthRate: ReturnType<typeof getWealthRate>
  wealthMeetsNisab: boolean | null
  nisabCheckApplied: boolean
}): CategoryBreakdown {
  const { category, items, subtotal, wealthRate, wealthMeetsNisab, nisabCheckApplied } = args
  const notes: string[] = []

  let isDue = !moneyIsZero(subtotal)
  let zakatDue = toMoney(0)

  if (moneyIsZero(subtotal)) {
    notes.push('Subtotal is zero — no zakat due for this category.')
    isDue = false
  } else if (nisabCheckApplied && wealthMeetsNisab === false) {
    notes.push(
      'Total wealth assets are below the provided nisāb threshold — wealth zakat set to 0.',
    )
    isDue = false
  } else {
    zakatDue = moneyPercent(subtotal, wealthRate.rate)
    if (!nisabCheckApplied) {
      notes.push(
        'Nisāb threshold was not provided — wealth zakat amount is computed but obligation is unchecked. ' +
          'Pass nisabThreshold (e.g. from GET /zakat/nisab-rate) to gate obligation.',
      )
    } else {
      notes.push('Total wealth assets meet or exceed the provided nisāb threshold.')
    }
  }

  return {
    category,
    subtotal: moneyToNumber(subtotal),
    assetCount: items.length,
    rate: rateToNumber(wealthRate.rate),
    ratePercentage: wealthRate.ratePercentage,
    rateLabel: wealthRate.label,
    zakatDue: moneyToNumber(zakatDue),
    isDue,
    notes,
    reference: wealthRate.reference,
  }
}

function computeAgriculturalCategory(args: {
  items: ZakatAssetInput[]
  subtotal: Decimal
  madhab: Madhab
}): CategoryBreakdown {
  const { items, subtotal, madhab } = args

  // All items in this category must share the same irrigation method for a
  // single category rate. Mixed methods across lines → compute per-line and sum.
  const irrigations = new Set(items.map((i) => i.irrigation!))

  if (irrigations.size === 1) {
    const irrigation = items[0]!.irrigation!
    const rule = getAgriculturalRate(madhab, irrigation)
    const zakatDue = moneyIsZero(subtotal)
      ? toMoney(0)
      : moneyPercent(subtotal, rule.rate)

    return {
      category: 'agricultural_produce',
      subtotal: moneyToNumber(subtotal),
      assetCount: items.length,
      rate: rateToNumber(rule.rate),
      ratePercentage: rule.ratePercentage,
      rateLabel: rule.label,
      zakatDue: moneyToNumber(zakatDue),
      isDue: !moneyIsZero(zakatDue),
      notes: moneyIsZero(subtotal)
        ? ['Subtotal is zero — no zakat due for this category.']
        : [`Applied ${rule.ratePercentage}% for irrigation="${irrigation}".`],
      reference: rule.reference,
    }
  }

  // Per-line rates when irrigation methods differ within the category
  let zakatSum = toMoney(0)
  const notes: string[] = [
    'Multiple irrigation methods in this category — zakat summed per asset line.',
  ]

  for (const item of items) {
    const rule = getAgriculturalRate(madhab, item.irrigation!)
    const lineZakat = moneyPercent(item.value, rule.rate)
    zakatSum = moneyAdd(zakatSum, lineZakat)
    notes.push(
      `Line value ${item.value} @ ${rule.ratePercentage}% (${item.irrigation}) → ${moneyToNumber(lineZakat)}`,
    )
  }

  return {
    category: 'agricultural_produce',
    subtotal: moneyToNumber(subtotal),
    assetCount: items.length,
    rate: 0,
    ratePercentage: 0,
    rateLabel: 'Mixed irrigation methods (per-line rates)',
    zakatDue: moneyToNumber(zakatSum),
    isDue: !moneyIsZero(zakatSum),
    notes,
    reference:
      'Per-line ʿushr rates (10% / 5% / 7.5%) — see individual line notes',
  }
}

function computeLivestockCategory(args: {
  items: ZakatAssetInput[]
  subtotal: Decimal
}): CategoryBreakdown {
  const { items, subtotal } = args
  const notes: string[] = []
  let zakatSum = toMoney(0)
  let totalAnimalsDue = 0
  let primaryAnimalType: LivestockAnimalType | undefined
  let totalHeadCount = 0
  let dueUnit = ''

  for (const item of items) {
    const animalType = item.animalType!
    const headCount = item.headCount!
    primaryAnimalType = primaryAnimalType ?? animalType
    totalHeadCount += headCount

    const due = getLivestockDue(animalType, headCount)

    // Camel herds > 75: engine refuses to invent the combination table
    if (
      animalType === 'camels' &&
      headCount > 75 &&
      due.animalsDue === 0 &&
      due.explanation.includes('does not invent')
    ) {
      throw ApiError.badRequest(
        `livestock camels with headCount=${headCount}: ` +
          'herds above 75 require the full classical combination table — ' +
          'this engine does not invent that ruling. Consult a qualified scholar.',
      )
    }

    totalAnimalsDue += due.animalsDue
    dueUnit = due.dueUnit
    notes.push(due.explanation)

    if (due.animalsDue === 0 || headCount === 0) {
      notes.push('No monetary zakat derived (zero animals due or empty herd).')
      continue
    }

    // Monetary equivalent: (animalsDue / headCount) × herd market value.
    // Transparent conversion — classical due is in animals; value is caller-supplied.
    const lineZakat = moneyMul(item.value, moneyDiv(due.animalsDue, headCount))
    zakatSum = moneyAdd(zakatSum, lineZakat)
    notes.push(
      `Monetary equivalent: (${due.animalsDue}/${headCount}) × ${item.value} = ${moneyToNumber(lineZakat)}. ` +
        `Classical due remains ${due.animalsDue} ${due.dueUnit}; money figure is a market-value conversion only.`,
    )
    notes.push(`Reference: ${due.reference}`)
  }

  return {
    category: 'livestock',
    subtotal: moneyToNumber(subtotal),
    assetCount: items.length,
    rate: 0,
    ratePercentage: 0,
    rateLabel: 'Classical headcount table (not a flat percentage)',
    zakatDue: moneyToNumber(zakatSum),
    isDue: !moneyIsZero(zakatSum),
    notes,
    reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (livestock tables)',
    livestock:
      primaryAnimalType !== undefined
        ? {
            animalType: primaryAnimalType,
            headCount: totalHeadCount,
            animalsDue: totalAnimalsDue,
            dueUnit,
          }
        : undefined,
  }
}

export default zakatCalculatorService

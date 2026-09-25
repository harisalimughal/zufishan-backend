/**
 * Zakat calculation rules — isolated, testable configuration.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANT — Religious transparency
 * ─────────────────────────────────────────────────────────────────────────────
 * This module encodes ONLY well-attested classical rates that are agreed (or
 * nearly agreed) across the four Sunni schools for the asset types we support.
 * Where a ruling requires facts we do not have, or where schools differ in a
 * way that cannot be reduced to a single rate, the engine MUST surface that
 * explicitly — it must never invent a fatwa silently.
 *
 * Sources referenced (not a substitute for a qualified scholar):
 *   • Sahih al-Bukhari — Kitāb al-Zakāh (livestock tables, ushr rates)
 *   • AAOIFI Sharia Standard No. 9 (Zakah)
 *   • Classical fiqh summaries for Hanafi / Shafiʿi / Maliki / Hanbali wealth rate
 *
 * Madhab parameter today mainly drives:
 *   1. Documented methodology metadata returned to the caller
 *   2. Future-safe hooks where schools diverge (currently rates are shared)
 *   3. Explicit notes about items the caller must include/exclude themselves
 *      (e.g. personal gold jewellery — zakatable in Hanafi; often exempt elsewhere)
 *
 * Wealth zakat rate of 2.5% (1/40) is agreed for cash, trade goods, and
 * monetary investments once nisāb and ḥawl conditions are met.
 * Ushr on produce: 10% (natural irrigation) / 5% (artificial) — prophetic.
 * Mixed irrigation: 7.5% is a documented middle position used by several
 * contemporary calculators; labelled as such, not as a universal fatwa.
 */

export type Madhab = 'hanafi' | 'shafi' | 'maliki' | 'hanbali'

export type ZakatAssetCategory =
  | 'cash'
  | 'gold_silver'
  | 'business_inventory'
  | 'agricultural_produce'
  | 'livestock'
  | 'investments'

export type IrrigationMethod = 'natural' | 'artificial' | 'mixed'

export type LivestockAnimalType = 'camels' | 'cattle' | 'sheep_goats'

/** Categories that share the standard 2.5% wealth-zakat rate. */
export const WEALTH_CATEGORIES: ReadonlySet<ZakatAssetCategory> = new Set([
  'cash',
  'gold_silver',
  'business_inventory',
  'investments',
])

export const ALL_ASSET_CATEGORIES: readonly ZakatAssetCategory[] = [
  'cash',
  'gold_silver',
  'business_inventory',
  'agricultural_produce',
  'livestock',
  'investments',
] as const

export const ALL_MADHABS: readonly Madhab[] = [
  'hanafi',
  'shafi',
  'maliki',
  'hanbali',
] as const

/** 2.5% = 1/40 — classical wealth zakat rate. */
export const WEALTH_ZAKAT_RATE = '0.025'

export interface MadhabProfile {
  key: Madhab
  name: string
  description: string
  /**
   * Guidance the API surfaces — NOT applied as silent filters on assets.
   * The caller decides what to include based on their scholar's advice.
   */
  inclusionNotes: string[]
  references: string[]
}

export const MADHAB_PROFILES: Record<Madhab, MadhabProfile> = {
  hanafi: {
    key: 'hanafi',
    name: 'Hanafi',
    description:
      'Hanafi school — wealth zakat at 2.5%; personal gold/silver jewellery is generally treated as zakatable.',
    inclusionNotes: [
      'Include personal gold and silver jewellery in gold_silver if following Hanafi rulings.',
      'Trade inventory (ʿurūḍ al-tijārah) is zakatable at market value.',
    ],
    references: [
      'Classical Hanafi fiqh summaries (Kitāb al-Zakāh)',
      'AAOIFI Sharia Standard No. 9 (where aligned)',
    ],
  },
  shafi: {
    key: 'shafi',
    name: 'Shafiʿi',
    description:
      'Shafiʿi school — wealth zakat at 2.5%; personal jewellery for permissible use is generally exempt.',
    inclusionNotes: [
      'Exclude personal gold/silver jewellery kept for permissible adornment unless your scholar advises otherwise.',
      'Include jewellery held as investment / savings.',
    ],
    references: [
      'Classical Shafiʿi fiqh summaries (Kitāb al-Zakāh)',
      'AAOIFI Sharia Standard No. 9 (where aligned)',
    ],
  },
  maliki: {
    key: 'maliki',
    name: 'Maliki',
    description:
      'Maliki school — wealth zakat at 2.5%; personal jewellery for adornment is generally exempt.',
    inclusionNotes: [
      'Exclude personal jewellery for adornment unless advised otherwise by a qualified scholar.',
      'Include trade goods and monetary investments.',
    ],
    references: [
      'Classical Maliki fiqh summaries (Kitāb al-Zakāh)',
      'AAOIFI Sharia Standard No. 9 (where aligned)',
    ],
  },
  hanbali: {
    key: 'hanbali',
    name: 'Hanbali',
    description:
      'Hanbali school — wealth zakat at 2.5%; personal jewellery for adornment is generally exempt.',
    inclusionNotes: [
      'Exclude personal jewellery for adornment unless advised otherwise by a qualified scholar.',
      'Include trade goods and monetary investments.',
    ],
    references: [
      'Classical Hanbali fiqh summaries (Kitāb al-Zakāh)',
      'AAOIFI Sharia Standard No. 9 (where aligned)',
    ],
  },
}

export interface RateRule {
  /** Decimal string rate, e.g. "0.025". */
  rate: string
  /** Human-readable percentage, e.g. 2.5 */
  ratePercentage: number
  label: string
  reference: string
}

/**
 * Wealth categories — identical 2.5% across the four schools for cash,
 * gold/silver (when zakatable), business inventory, and investments.
 */
export function getWealthRate(_madhab: Madhab): RateRule {
  return {
    rate: WEALTH_ZAKAT_RATE,
    ratePercentage: 2.5,
    label: 'Wealth zakat (1/40)',
    reference:
      'Agreed classical rate of 2.5% on zakatable wealth once nisāb and ḥawl are met',
  }
}

/**
 * Agricultural produce (ʿushr) rates — prophetic, shared across schools.
 * Mixed irrigation uses the documented middle rate of 7.5%.
 */
export function getAgriculturalRate(
  _madhab: Madhab,
  irrigation: IrrigationMethod,
): RateRule {
  switch (irrigation) {
    case 'natural':
      return {
        rate: '0.10',
        ratePercentage: 10,
        label: 'ʿUshr — naturally irrigated produce',
        reference:
          'Prophetic rate of one-tenth (10%) on produce watered by rain/springs',
      }
    case 'artificial':
      return {
        rate: '0.05',
        ratePercentage: 5,
        label: 'Half-ʿushr — artificially irrigated produce',
        reference:
          'Prophetic rate of one-twentieth (5%) on produce watered by labour/irrigation',
      }
    case 'mixed':
      return {
        rate: '0.075',
        ratePercentage: 7.5,
        label: 'Mixed irrigation — middle rate',
        reference:
          'Documented middle position (7.5%) when irrigation is mixed; confirm with a scholar for your case',
      }
  }
}

/**
 * Classical livestock zakat tables (animals due by headcount).
 * Shared baseline used across schools for common ranges; monetary conversion
 * is derived only when the caller also supplies a herd market `value`.
 *
 * Returns number of animals due (sheep/goats for camel brackets that pay sheep).
 */
export interface LivestockDue {
  animalsDue: number
  /** What kind of animal is owed (may differ from herd type for low camel brackets). */
  dueUnit: 'sheep' | 'goat_or_sheep' | 'cattle_tabee' | 'cattle_musinnah' | 'camel_bint_makhad' | 'camel_bint_labun' | 'camel_hiqqah' | 'camel_jadha'
  explanation: string
  reference: string
}

/**
 * Sheep/goats (ghanam) — Sahih al-Bukhari livestock chapter (widely applied).
 *   < 40 → 0
 *   40–120 → 1
 *   121–200 → 2
 *   201–399 → 3
 *   ≥ 400 → 1 per 100
 */
export function sheepGoatsDue(headCount: number): LivestockDue {
  if (headCount < 40) {
    return {
      animalsDue: 0,
      dueUnit: 'sheep',
      explanation: `Herd of ${headCount} is below the nisāb of 40 sheep/goats.`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (sheep/goats)',
    }
  }
  if (headCount <= 120) {
    return {
      animalsDue: 1,
      dueUnit: 'sheep',
      explanation: `40–120 sheep/goats → 1 sheep due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (sheep/goats)',
    }
  }
  if (headCount <= 200) {
    return {
      animalsDue: 2,
      dueUnit: 'sheep',
      explanation: `121–200 sheep/goats → 2 sheep due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (sheep/goats)',
    }
  }
  if (headCount < 400) {
    return {
      animalsDue: 3,
      dueUnit: 'sheep',
      explanation: `201–399 sheep/goats → 3 sheep due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (sheep/goats)',
    }
  }
  const due = Math.floor(headCount / 100)
  return {
    animalsDue: due,
    dueUnit: 'sheep',
    explanation: `≥ 400 sheep/goats → 1 sheep per 100 (${headCount} head → ${due}).`,
    reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (sheep/goats)',
  }
}

/**
 * Cattle (baqar):
 *   < 30 → 0
 *   30–39 → 1 tabīʿ (1-year-old)
 *   40–59 → 1 musinnah (2-year-old)
 *   Then: 1 tabīʿ per 30 and 1 musinnah per 40 (simplified classical progression).
 *
 * For monetary conversion we return a single animalsDue count using the
 * dominant bracket animal; detailed age-class splitting is noted in explanation.
 */
export function cattleDue(headCount: number): LivestockDue {
  if (headCount < 30) {
    return {
      animalsDue: 0,
      dueUnit: 'cattle_tabee',
      explanation: `Herd of ${headCount} is below the nisāb of 30 cattle.`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (cattle)',
    }
  }
  if (headCount < 40) {
    return {
      animalsDue: 1,
      dueUnit: 'cattle_tabee',
      explanation: `30–39 cattle → 1 tabīʿ due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (cattle)',
    }
  }
  if (headCount < 60) {
    return {
      animalsDue: 1,
      dueUnit: 'cattle_musinnah',
      explanation: `40–59 cattle → 1 musinnah due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (cattle)',
    }
  }
  // Simplified: for ≥ 60, 1 animal per 30 head (common calculator simplification).
  // Full age-class mix (tabīʿ vs musinnah) should be confirmed with a scholar.
  const due = Math.floor(headCount / 30)
  return {
    animalsDue: due,
    dueUnit: 'cattle_tabee',
    explanation:
      `≥ 60 cattle → approximately 1 animal per 30 head (${headCount} → ${due}). ` +
      `Exact tabīʿ/musinnah mix should be confirmed with a qualified scholar.`,
    reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (cattle); simplified progression for ≥ 60',
  }
}

/**
 * Camels — opening brackets (sheep due) then camel-age brackets.
 * Full classical table is extensive; we cover the widely published ranges
 * and flag very large herds for scholarly confirmation.
 */
export function camelsDue(headCount: number): LivestockDue {
  if (headCount < 5) {
    return {
      animalsDue: 0,
      dueUnit: 'goat_or_sheep',
      explanation: `Herd of ${headCount} is below the nisāb of 5 camels.`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels)',
    }
  }
  if (headCount <= 9) {
    return {
      animalsDue: 1,
      dueUnit: 'goat_or_sheep',
      explanation: `5–9 camels → 1 sheep/goat due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels)',
    }
  }
  if (headCount <= 14) {
    return {
      animalsDue: 2,
      dueUnit: 'goat_or_sheep',
      explanation: `10–14 camels → 2 sheep/goats due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels)',
    }
  }
  if (headCount <= 19) {
    return {
      animalsDue: 3,
      dueUnit: 'goat_or_sheep',
      explanation: `15–19 camels → 3 sheep/goats due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels)',
    }
  }
  if (headCount <= 24) {
    return {
      animalsDue: 4,
      dueUnit: 'goat_or_sheep',
      explanation: `20–24 camels → 4 sheep/goats due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels)',
    }
  }
  if (headCount <= 35) {
    return {
      animalsDue: 1,
      dueUnit: 'camel_bint_makhad',
      explanation: `25–35 camels → 1 bint makhāḍ due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels)',
    }
  }
  if (headCount <= 45) {
    return {
      animalsDue: 1,
      dueUnit: 'camel_bint_labun',
      explanation: `36–45 camels → 1 bint labūn due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels)',
    }
  }
  if (headCount <= 60) {
    return {
      animalsDue: 1,
      dueUnit: 'camel_hiqqah',
      explanation: `46–60 camels → 1 ḥiqqah due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels)',
    }
  }
  if (headCount <= 75) {
    return {
      animalsDue: 1,
      dueUnit: 'camel_jadha',
      explanation: `61–75 camels → 1 jadhaʿah due (${headCount} head).`,
      reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels)',
    }
  }
  // Beyond 75 the classical table continues with combinations; do not invent.
  return {
    animalsDue: 0,
    dueUnit: 'camel_jadha',
    explanation:
      `Camel herds above 75 head require the full classical combination table. ` +
      `This engine does not invent that ruling — consult a qualified scholar. (headCount=${headCount})`,
    reference: 'Sahih al-Bukhari — Kitāb al-Zakāh (camels); range > 75 not auto-computed',
  }
}

export function getLivestockDue(
  animalType: LivestockAnimalType,
  headCount: number,
): LivestockDue {
  switch (animalType) {
    case 'sheep_goats':
      return sheepGoatsDue(headCount)
    case 'cattle':
      return cattleDue(headCount)
    case 'camels':
      return camelsDue(headCount)
  }
}

export function getMadhabProfile(madhab: Madhab): MadhabProfile {
  return MADHAB_PROFILES[madhab]
}

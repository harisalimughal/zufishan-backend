/**
 * RAG — Fiqhi Guardrail (Hardened)
 *
 * Classifies user messages for Islamic religious ruling / fatwa intent.
 *
 * ARCHITECTURE:
 * - Runs BEFORE the RAG pipeline, BEFORE any LLM call.
 * - Returns a structured ClassificationResult — never just a boolean.
 * - Fail-safe: UNCERTAIN_RELIGIOUS signals → routed to scholar (not AI).
 * - Adversarial rewordings are explicitly detected (see ADVERSARIAL_PATTERNS).
 * - Classification result is logged for audit and human review.
 * - Cannot be bypassed by prompt injection (runs on raw user input, not LLM output).
 *
 * FATWA CATEGORIES (for frontend Scholar Connect routing):
 *   PRAYER_WORSHIP    — salah, wudu, fasting, hajj validity
 *   FOOD_DRINK        — halal/haram food, slaughter
 *   FINANCIAL         — riba, zakat edge cases, contracts, insurance
 *   MARRIAGE_FAMILY   — nikah, divorce, inheritance, mahram
 *   GENERAL_RULING    — catch-all for any other Islamic ruling request
 *   ADVERSARIAL       — disguised ruling request detected
 *
 * FAIL-SAFE POLICY:
 *   Any uncertain religious question (UNCERTAIN signal) routes to scholar
 *   rather than being answered by AI. It is safer to over-redirect than
 *   to accidentally generate an Islamic ruling.
 */

// ─── Fatwa category enum ───────────────────────────────────────────────────────

export const FatwaCategory = {
  PRAYER_WORSHIP:   'PRAYER_WORSHIP',
  FOOD_DRINK:       'FOOD_DRINK',
  FINANCIAL:        'FINANCIAL',
  MARRIAGE_FAMILY:  'MARRIAGE_FAMILY',
  GENERAL_RULING:   'GENERAL_RULING',
  ADVERSARIAL:      'ADVERSARIAL',
} as const

export type FatwaCategory = (typeof FatwaCategory)[keyof typeof FatwaCategory]

// ─── Classification result ─────────────────────────────────────────────────────

export interface FiqhiClassificationResult {
  /** Whether this message is classified as a fiqhi/ruling query */
  isFiqhi: boolean
  /** Fatwa category to route the user to in Scholar Connect UI */
  category: FatwaCategory | null
  /** The matched pattern description (for logging/audit) */
  matchedPatternLabel: string | null
  /** True if the query was an adversarial/disguised attempt */
  isAdversarial: boolean
  /** True if the message triggered the fail-safe uncertainty gate */
  isUncertain: boolean
  /** Human-readable redirect message */
  redirectMessage: string | null
}

// ─── Pattern entry structure ───────────────────────────────────────────────────

interface PatternEntry {
  pattern: RegExp
  label: string
  category: FatwaCategory
}

// ─── Tier 1: Direct ruling/fatwa requests ─────────────────────────────────────

const DIRECT_PATTERNS: PatternEntry[] = [
  // Fatwa words
  { pattern: /\b(fatwa|fatwah|futwa|fatawa)\b/i,                                                     label: 'Direct fatwa request',           category: 'GENERAL_RULING' },
  // Permissibility — also catch "X halal/haram" without "is it" prefix
  { pattern: /\bis it (haram|halal|permissible|allowed|forbidden|prohibited|sinful|lawful|unlawful)\b/i, label: 'Permissibility question',         category: 'GENERAL_RULING' },
  { pattern: /\b(is|are)\s+(\w+\s+){0,5}(halal|haram|permissible|forbidden|lawful|unlawful)\b/i,    label: 'Is X halal/haram query',           category: 'GENERAL_RULING' },
  { pattern: /\b(haram|halal|makruh|mubah|mustahabb|wajib|fard)\s+(to|for|if|when|that)\b/i,        label: 'Ruling term + verb',              category: 'GENERAL_RULING' },
  // Ruling language
  { pattern: /\b(islamic|sharia|shariah|fiqh|fiqhi)\s+(ruling|law|position|view|verdict|opinion)\b/i, label: 'Islamic ruling phrase',            category: 'GENERAL_RULING' },
  { pattern: /\bruling (on|about|regarding|for|in)\b/i,                                              label: 'Ruling on topic',                  category: 'GENERAL_RULING' },
  { pattern: /\bwhat (is|are) (the )?ruling\b/i,                                                     label: 'What is the ruling',               category: 'GENERAL_RULING' },
  // Scholar/madhab
  { pattern: /\b(hanafi|maliki|shafi'?i?|hanbali|zahiri)\s+(ruling|position|view|opinion|madhab)\b/i, label: 'Madhab-specific ruling',           category: 'GENERAL_RULING' },
  { pattern: /\baccording to (the )?(hanafi|maliki|shafi|hanbali|four|all) (madhab|madhhab|school|imams?)\b/i, label: 'Madhab attribution',       category: 'GENERAL_RULING' },
  { pattern: /\bscholars (say|agree|disagree|differ|permit|forbid|allow)\b/i,                        label: 'Scholar consensus query',          category: 'GENERAL_RULING' },
  // Islam says / Quran / Hadith
  { pattern: /\bwhat (does|do) (islam|the quran|the hadith?|ulema|ulama|fiqh|sharia) (say|teach|state|rule)\b/i, label: 'What does Islam say',    category: 'GENERAL_RULING' },
  { pattern: /\b(quran|hadith|sunnah) (says?|states?|rules?|teaches?|allows?|forbids?)\b/i,         label: 'Quran/Hadith ruling',              category: 'GENERAL_RULING' },
]

// ─── Tier 2: Topic-specific ruling patterns ────────────────────────────────────

const TOPICAL_PATTERNS: PatternEntry[] = [
  // Prayer & worship validity
  { pattern: /\b(is|was) (my|this|that|the)\s+(prayer|salah|salat|wudu|ghusl|fasting|sawm|hajj|umrah)\s+(valid|correct|accepted|nullified|broken|void|counted)\b/i, label: 'Worship validity check', category: 'PRAYER_WORSHIP' },
  { pattern: /\b(does|do|did) (this|that|it|laughing|bleeding|passing gas|vomiting|sleeping)\s+(break|nullify|invalidate|void)\s+(my|the)?\s*(wudu|ghusl|fast|sawm|salah|prayer)\b/i, label: 'Worship nullification',  category: 'PRAYER_WORSHIP' },
  { pattern: /\b(does|do) (laughing|talking|moving|touching) (break|nullify|invalidate)\s+(salah|prayer|wudu)\b/i, label: 'Action nullification query', category: 'PRAYER_WORSHIP' },
  { pattern: /\b(can i|should i|must i)\s+(pray|make wudu|fast|do ghusl|pay zakat|go hajj)\b/i,    label: 'Worship obligation query',         category: 'PRAYER_WORSHIP' },
  { pattern: /\b(prayer|salah|salat) (time|direction|qiblah) (correct|valid|off|wrong)\b/i,         label: 'Prayer correctness query',         category: 'PRAYER_WORSHIP' },

  // Food & drink
  { pattern: /\b(is|are)\s+(pork|alcohol|wine|beer|gelatin|shellfish|crab|lobster|shrimp|octopus|blood|carrion)\s+(halal|haram|allowed|permitted|forbidden)\b/i, label: 'Food halal/haram query', category: 'FOOD_DRINK' },
  { pattern: /\b(halal|haram)\s+(food|meat|chicken|beef|lamb|fish|seafood|restaurant|slaughter|zabiha|dhabiha)\b/i, label: 'Halal food noun phrase', category: 'FOOD_DRINK' },
  { pattern: /\bwhat makes\s+(meat|food|drink|animal)\s+(halal|haram|permissible|forbidden)\b/i,                  label: 'Halal criteria query',    category: 'FOOD_DRINK' },
  { pattern: /\bcan (muslims?|i)\s+(eat|drink|consume)\b/i,                                          label: 'Muslim eating/drinking query',     category: 'FOOD_DRINK' },

  // Financial
  { pattern: /\b(riba|interest|usury)\b.{0,40}\b(halal|haram|allowed|permitted|forbidden|bank|loan|mortgage)\b/i, label: 'Riba/interest ruling',  category: 'FINANCIAL' },
  { pattern: /\b(insurance|cryptocurrency|bitcoin|stocks?|trading|forex|investment)\b.{0,50}\b(halal|haram|permissible|forbidden|islamic)\b/i, label: 'Financial instrument ruling', category: 'FINANCIAL' },
  { pattern: /\b(zakat) (on|for|due on|applicable to)\b.{0,60}\b(gold|silver|cash|savings|stocks?|business|property)\b/i, label: 'Zakat applicability edge case', category: 'FINANCIAL' },

  // Marriage & family
  { pattern: /\b(nikah|marriage|divorce|talaq|khul|iddah|mahram|mahr|mehr|polygamy|polygyny)\b.{0,60}\b(valid|allowed|haram|halal|permissible|islamic|ruling|legal)\b/i, label: 'Marriage/family ruling',  category: 'MARRIAGE_FAMILY' },
  { pattern: /\b(can i|is it allowed to)\s+(marry|divorce|remarry|have more than one wife|take a second wife)\b/i, label: 'Marriage permission query', category: 'MARRIAGE_FAMILY' },
  { pattern: /\b(inheritance|wasiyyah|will)\s+(islamic|sharia|in islam|according to|ruling|law)\b/i, label: 'Inheritance ruling query',           category: 'MARRIAGE_FAMILY' },

  // Sin accountability
  { pattern: /\b(is it a? ?)?(sin|sinful|gunah|gunnah)\s+(to|for|if|when)\b/i,                     label: 'Sin inquiry',                      category: 'GENERAL_RULING' },
  { pattern: /\bgunah\b/i,                                                                             label: 'Urdu sin word (standalone)',        category: 'GENERAL_RULING' },
  { pattern: /\bwill (i|allah)\b.{0,40}\b(punish|forgive|be held accountable|be judged)\b/i,        label: 'Divine punishment/forgiveness',    category: 'GENERAL_RULING' },
  { pattern: /\b(major|minor|kabira|saghira)\s+(sin|sins)\b/i,                                      label: 'Sin classification query',         category: 'GENERAL_RULING' },
]

// ─── Tier 3: Adversarial / disguised ruling requests ──────────────────────────
// These patterns detect attempts to extract rulings while pretending not to ask
// for a fatwa. Fail-safe: all trigger scholar redirect regardless of framing.

const ADVERSARIAL_PATTERNS: PatternEntry[] = [
  // "My friend / someone I know" framing
  { pattern: /\b(my friend|a friend|my brother|my sister|my wife|my husband|someone|a person)\s+(wants? to know|is asking|asked me|needs to know)\b.{0,100}\b(halal|haram|allowed|permitted|islam|ruling)\b/i, label: 'Disguised ruling via third party',       category: 'ADVERSARIAL' },

  // "Hypothetically / academically / theoretically" framing
  { pattern: /\b(hypothetically|theoretically|academically|just for argument|in theory)\b.{0,100}\b(halal|haram|allowed|islam|ruling|sharia|permitted|forbidden)\b/i, label: 'Hypothetical ruling frame',              category: 'ADVERSARIAL' },

  // "I know you can't give fatwas but..." — explicit bypass attempt
  { pattern: /\b(i know you (can'?t|cannot|don'?t|won'?t)|not asking for a fatwa|just your opinion|not a religious ruling|i understand you'?re not a scholar)\b.{0,200}\b(halal|haram|permitted|allowed|forbidden|ruling|islam)\b/i, label: 'Explicit fatwa bypass attempt',           category: 'ADVERSARIAL' },

  // "From a Sharia / Islamic perspective..."
  { pattern: /\b(from (a|an) (sharia|islamic|fiqh|religious|quran|hadith) (perspective|standpoint|point of view|lens|angle))\b/i, label: 'Framed as Islamic perspective query',    category: 'ADVERSARIAL' },

  // "Islamically speaking / in Islam..."
  { pattern: /\b(islamically speaking|islamically,|in islam,|in the islamic faith|according to islamic teaching|from an islamic viewpoint)\b/i, label: 'Islamic framing prefix',                  category: 'ADVERSARIAL' },

  // Roleplay / persona bypass
  { pattern: /\b(pretend|act|imagine|roleplay|assume|act as if)\b.{0,60}\b(you are|you'?re|you were)\b.{0,80}\b(scholar|mufti|imam|sheikh|ustadh|islamic scholar)\b/i, label: 'Scholar persona roleplay attempt',       category: 'ADVERSARIAL' },
  { pattern: /\b(as (an?|a) (islamic )?scholar|as (a |an )?mufti|as (an?|a) sheikh|as (an?|a) imam)\b/i, label: 'Scholar persona prefix',                  category: 'ADVERSARIAL' },

  // "Just curious / general knowledge" framing
  { pattern: /\b(just curious|out of curiosity|just wondering|general knowledge|purely academic|for educational purposes)\b.{0,200}\b(halal|haram|allowed|forbidden|islam|ruling|sharia|permitted)\b/i, label: 'Curiosity framing bypass',               category: 'ADVERSARIAL' },

  // "What do most scholars agree on..."
  { pattern: /\bwhat do (most|many|the majority of|all) scholars (say|agree|think|believe|hold|consider)\b/i, label: 'Scholar consensus query',               category: 'ADVERSARIAL' },

  // "Is there a difference of opinion on..."
  { pattern: /\b(is there|are there) (a |any )?(difference|disagreement|ikhtilaf|khilaf) (of opinion|among scholars)\b/i, label: 'Ikhtilaf query (scholarly disagreement)', category: 'ADVERSARIAL' },

  // Embedded instruction attack: instruction in retrieved content shape
  { pattern: /\b(ignore (previous|above|all|your) instructions?|disregard|override|bypass|forget (the )?system prompt)\b/i, label: 'Prompt injection attempt',              category: 'ADVERSARIAL' },
]

// ─── Tier 4: Fail-safe uncertain religious signal ─────────────────────────────
// Catches religious questions that don't match specific patterns but show
// indicators of religious concern combined with a question format.
// Policy: route to scholar rather than risk generating a religious ruling.

const UNCERTAIN_RELIGIOUS_PATTERNS: PatternEntry[] = [
  { pattern: /\b(is it (ok|okay|fine|acceptable|appropriate))\b.{0,80}\b(as a muslim|for muslims?|in our religion|in islam|islamically)\b/i, label: 'Uncertain religious acceptability',      category: 'GENERAL_RULING' },
  { pattern: /\b(what should (i|we|muslims?) do)\b.{0,80}\b(islam|islamically|quran|hadith|sunnah|sharia|scholars)\b/i,                      label: 'Uncertain religious guidance query',    category: 'GENERAL_RULING' },
  { pattern: /\b(does allah|will allah)\b.{0,80}\b(accept|approve|forgive|allow|permit|judge)\b/i,                                          label: 'Allah acceptance/approval query',       category: 'GENERAL_RULING' },
  { pattern: /\b(am i sinning|am i committing (a )?sin|is this (a )?sin)\b/i,                                                               label: 'Sinfulness self-check',                 category: 'GENERAL_RULING' },
  { pattern: /\b(is (this|it|that) (islamically|religiously) (correct|acceptable|appropriate|valid|wrong))\b/i,                              label: 'Uncertain Islamic correctness',         category: 'GENERAL_RULING' },
]

// ─── Classifier ───────────────────────────────────────────────────────────────

/**
 * Classifies a user message for fiqhi/ruling intent.
 *
 * Runs all pattern tiers in priority order:
 *   Adversarial → Direct → Topical → Uncertain (fail-safe)
 *
 * Returns a structured result suitable for logging, routing, and API response.
 * Never returns just a boolean — always includes audit metadata.
 */
export function classifyFiqhiQuery(message: string): FiqhiClassificationResult {
  const normalized = message.trim()

  // Tier 3 first — catch disguised/adversarial attempts before anything else
  for (const entry of ADVERSARIAL_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return {
        isFiqhi: true,
        category: entry.category,
        matchedPatternLabel: entry.label,
        isAdversarial: true,
        isUncertain: false,
        redirectMessage: buildRedirectMessage(entry.category, message),
      }
    }
  }

  // Tier 2 first (before Tier 1) — topic-specific patterns carry more precise categories.
  // Run these before the broad direct patterns so FOOD_DRINK / FINANCIAL / etc.
  // correctly win over GENERAL_RULING for topic-specific messages.
  for (const entry of TOPICAL_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return {
        isFiqhi: true,
        category: entry.category,
        matchedPatternLabel: entry.label,
        isAdversarial: false,
        isUncertain: false,
        redirectMessage: buildRedirectMessage(entry.category, message),
      }
    }
  }

  // Tier 1 — direct fatwa/ruling requests (catch-all for anything not topical)
  for (const entry of DIRECT_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return {
        isFiqhi: true,
        category: entry.category,
        matchedPatternLabel: entry.label,
        isAdversarial: false,
        isUncertain: false,
        redirectMessage: buildRedirectMessage(entry.category, message),
      }
    }
  }

  // Tier 4 — fail-safe uncertain religious signals
  for (const entry of UNCERTAIN_RELIGIOUS_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return {
        isFiqhi: true,
        category: entry.category,
        matchedPatternLabel: entry.label,
        isAdversarial: false,
        isUncertain: true,
        redirectMessage: buildRedirectMessage(entry.category, message),
      }
    }
  }

  // Not classified as fiqhi
  return {
    isFiqhi: false,
    category: null,
    matchedPatternLabel: null,
    isAdversarial: false,
    isUncertain: false,
    redirectMessage: null,
  }
}

/**
 * Backward-compatible simple boolean check.
 * Prefer classifyFiqhiQuery() for full structured results.
 */
export function isFiqhiQuery(message: string): boolean {
  return classifyFiqhiQuery(message).isFiqhi
}

// ─── Category-aware redirect messages ─────────────────────────────────────────

const CATEGORY_HINTS: Record<FatwaCategory, string> = {
  PRAYER_WORSHIP:  'Prayer, Worship & Purification',
  FOOD_DRINK:      'Halal Food & Drink',
  FINANCIAL:       'Islamic Finance & Zakat',
  MARRIAGE_FAMILY: 'Marriage, Family & Inheritance',
  GENERAL_RULING:  'General Islamic Rulings',
  ADVERSARIAL:     'General Islamic Rulings',
}

function buildRedirectMessage(category: FatwaCategory, originalQuestion: string): string {
  const hint = CATEGORY_HINTS[category]
  const preview = originalQuestion.length > 120
    ? originalQuestion.slice(0, 117) + '...'
    : originalQuestion

  return (
    `This question requires a qualified Islamic scholar's guidance.\n\n` +
    `The Zufishan AI Assistant is not authorised to issue Islamic religious rulings or fatwas. ` +
    `Answering this incorrectly could cause harm — so we always route these questions to a human scholar.\n\n` +
    `**Your question:** "${preview}"\n\n` +
    `**Suggested category in Scholar Connect:** ${hint}\n\n` +
    `Please use **Scholar Connect** (sidebar → Scholar Connect) to submit this question to a qualified Ustadh or Mufti. ` +
    `They will provide a proper, accountable response. May Allah make it easy for you. 🌙`
  )
}

// ─── Exported redirect message (for cases without a full classify call) ────────

export const SCHOLAR_REDIRECT_MESSAGE =
  "This question relates to Islamic religious rulings (fiqh/fatwa), which requires guidance from a qualified Islamic scholar. " +
  "The Zufishan AI Assistant is not authorised to issue religious verdicts. " +
  "Please use the Scholar Connect feature to reach a qualified Ustadh or Mufti who can provide proper guidance. " +
  "May Allah make it easy for you. 🌙"

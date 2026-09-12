import { z } from 'zod'

// ============================================================
// SHARED
// ============================================================

/** Latitude / longitude pair used by prayer-times & qibla */
export const coordinatesSchema = z.object({
  latitude: z
    .string()
    .or(z.number())
    .transform((v) => parseFloat(String(v)))
    .refine((v) => v >= -90 && v <= 90, { message: 'latitude must be between -90 and 90' }),
  longitude: z
    .string()
    .or(z.number())
    .transform((v) => parseFloat(String(v)))
    .refine((v) => v >= -180 && v <= 180, { message: 'longitude must be between -180 and 180' }),
})

// ============================================================
// PRAYER TIMES
// ============================================================

/**
 * Accepts both short aliases (lat/lng) and long form (latitude/longitude).
 * Also accepts asrMethod: 0 = Standard/Shafi'i (default), 1 = Hanafi.
 * method: AlAdhan calculation method name, e.g. MWL, ISNA, Egypt, Karachi, etc.
 */
export const prayerTimesQuerySchema = z
  .object({
    // ── coordinate aliases (lat / lng) ──
    lat: z
      .string()
      .or(z.number())
      .optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    lng: z
      .string()
      .or(z.number())
      .optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    // ── coordinate aliases (latitude / longitude) ──
    latitude: z
      .string()
      .or(z.number())
      .optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    longitude: z
      .string()
      .or(z.number())
      .optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    // ── method + date ──
    method: z.string().optional().default('MWL'),
    asrMethod: z
      .string()
      .or(z.number())
      .optional()
      .transform((v) => {
        if (v === undefined || v === null || v === '') return 0
        const n = parseInt(String(v), 10)
        return isNaN(n) ? 0 : n
      })
      .refine((v) => v === 0 || v === 1, {
        message: 'asrMethod must be 0 (Standard/Shafi\'i) or 1 (Hanafi)',
      })
      .default(0),
    date: z
      .string()
      .optional()
      .refine((d) => !d || !isNaN(Date.parse(d)), {
        message: 'date must be a valid ISO date string (YYYY-MM-DD)',
      }),
  })
  .transform((raw) => {
    // Merge aliases: lat overrides latitude, lng overrides longitude
    const latitude = raw.lat ?? raw.latitude
    const longitude = raw.lng ?? raw.longitude
    return {
      lat: latitude,
      lng: longitude,
      latitude,
      longitude,
      method: raw.method,
      asrMethod: raw.asrMethod,
      date: raw.date,
    }
  })
  .refine((v) => v.latitude !== undefined, {
    message: 'latitude (or lat) is required',
    path: ['latitude'],
  })
  .refine((v) => v.longitude !== undefined, {
    message: 'longitude (or lng) is required',
    path: ['longitude'],
  })
  .refine((v) => v.latitude! >= -90 && v.latitude! <= 90, {
    message: 'latitude must be between -90 and 90',
    path: ['latitude'],
  })
  .refine((v) => v.longitude! >= -180 && v.longitude! <= 180, {
    message: 'longitude must be between -180 and 180',
    path: ['longitude'],
  })

export type PrayerTimesQuery = z.infer<typeof prayerTimesQuerySchema>

// ============================================================
// QIBLA
// ============================================================

export const qiblaQuerySchema = z
  .object({
    lat: z.string().or(z.number()).optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    lng: z.string().or(z.number()).optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    latitude: z.string().or(z.number()).optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    longitude: z.string().or(z.number()).optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
  })
  .transform((raw) => ({
    latitude:  raw.lat ?? raw.latitude,
    longitude: raw.lng ?? raw.longitude,
  }))
  .refine((v) => v.latitude !== undefined, { message: 'latitude (or lat) is required', path: ['latitude'] })
  .refine((v) => v.longitude !== undefined, { message: 'longitude (or lng) is required', path: ['longitude'] })
  .refine((v) => v.latitude! >= -90 && v.latitude! <= 90, { message: 'latitude must be between -90 and 90', path: ['latitude'] })
  .refine((v) => v.longitude! >= -180 && v.longitude! <= 180, { message: 'longitude must be between -180 and 180', path: ['longitude'] })

export type QiblaQuery = z.infer<typeof qiblaQuerySchema>

// ============================================================
// HIJRI DATE
// ============================================================

export const hijriDateQuerySchema = z
  .object({
    date: z
      .string()
      .optional()
      .refine(
        (d) => !d || !isNaN(Date.parse(d)),
        { message: 'date must be a valid date string (e.g. YYYY-MM-DD or DD-MM-YYYY)' }
      ),
    lat: z.string().or(z.number()).optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    lng: z.string().or(z.number()).optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    latitude: z.string().or(z.number()).optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    longitude: z.string().or(z.number()).optional()
      .transform((v) => (v !== undefined ? parseFloat(String(v)) : undefined)),
    adjustment: z.string().or(z.number()).optional()
      .transform((v) => (v !== undefined ? parseInt(String(v), 10) : undefined)),
  })
  .transform((raw) => ({
    date: raw.date,
    latitude: raw.lat ?? raw.latitude,
    longitude: raw.lng ?? raw.longitude,
    adjustment: raw.adjustment,
  }))
  .refine(
    (v) => v.latitude === undefined || (v.latitude >= -90 && v.latitude <= 90),
    { message: 'latitude must be between -90 and 90', path: ['latitude'] }
  )
  .refine(
    (v) => v.longitude === undefined || (v.longitude >= -180 && v.longitude <= 180),
    { message: 'longitude must be between -180 and 180', path: ['longitude'] }
  )
  .refine(
    (v) => v.adjustment === undefined || (v.adjustment >= -3 && v.adjustment <= 3),
    { message: 'adjustment must be an integer between -3 and 3', path: ['adjustment'] }
  )

export type HijriDateQuery = z.infer<typeof hijriDateQuerySchema>

// ============================================================
// ZAKAT — NISAB RATE QUERY
// ============================================================

export const nisabRateQuerySchema = z.object({
  currency: z
    .string()
    .length(3, 'currency must be a 3-letter ISO 4217 code (e.g. USD, PKR, EUR)')
    .regex(/^[A-Za-z]{3}$/, 'currency must be 3 alphabetic characters')
    .transform((v) => v.toUpperCase())
    .optional()
    .default('USD'),
  methodology: z
    .enum(['SOUTH_ASIAN', 'AAOIFI'], {
      errorMap: () => ({
        message: 'methodology must be SOUTH_ASIAN (Darul Uloom Deoband — 7.5 tola) or AAOIFI (85g standard)',
      }),
    })
    .optional()
    .default('SOUTH_ASIAN'),
})

export type NisabRateQuery = z.infer<typeof nisabRateQuerySchema>


// ============================================================
// ZAKAT — CALCULATE
// ============================================================

const zakatAssetCategorySchema = z.enum(
  [
    'cash',
    'gold_silver',
    'business_inventory',
    'agricultural_produce',
    'livestock',
    'investments',
  ],
  {
    errorMap: () => ({
      message:
        'category must be one of: cash, gold_silver, business_inventory, ' +
        'agricultural_produce, livestock, investments',
    }),
  },
)

const zakatAssetSchema = z
  .object({
    category: zakatAssetCategorySchema,
    value: z
      .number({ invalid_type_error: 'value must be a number' })
      .finite('value must be a finite number')
      .nonnegative('value must be ≥ 0'),
    irrigation: z
      .enum(['natural', 'artificial', 'mixed'], {
        errorMap: () => ({
          message: 'irrigation must be natural, artificial, or mixed',
        }),
      })
      .optional(),
    animalType: z
      .enum(['camels', 'cattle', 'sheep_goats'], {
        errorMap: () => ({
          message: 'animalType must be camels, cattle, or sheep_goats',
        }),
      })
      .optional(),
    headCount: z
      .number({ invalid_type_error: 'headCount must be a number' })
      .int('headCount must be an integer')
      .nonnegative('headCount must be ≥ 0')
      .optional(),
  })
  .superRefine((asset, ctx) => {
    if (asset.category === 'agricultural_produce' && !asset.irrigation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'agricultural_produce requires irrigation (natural | artificial | mixed)',
        path: ['irrigation'],
      })
    }
    if (asset.category === 'livestock') {
      if (!asset.animalType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'livestock requires animalType (camels | cattle | sheep_goats)',
          path: ['animalType'],
        })
      }
      if (asset.headCount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'livestock requires headCount (classical tables are headcount-based)',
          path: ['headCount'],
        })
      }
    }
  })

export const zakatCalculateSchema = z.object({
  assets: z
    .array(zakatAssetSchema)
    .min(1, 'At least one asset is required'),
  madhab: z.enum(['hanafi', 'shafi', 'maliki', 'hanbali'], {
    errorMap: () => ({
      message: 'madhab must be one of: hanafi, shafi, maliki, hanbali',
    }),
  }),
  /**
   * Optional nisāb gate for wealth categories.
   * Fetch from GET /zakat/nisab-rate (e.g. lowerNisabValue).
   */
  nisabThreshold: z
    .number()
    .finite()
    .nonnegative('nisabThreshold must be ≥ 0')
    .optional(),
  currency: z
    .string()
    .length(3, 'currency must be a 3-letter ISO 4217 code')
    .regex(/^[A-Za-z]{3}$/, 'currency must be 3 alphabetic characters')
    .transform((v) => v.toUpperCase())
    .optional()
    .default('USD'),
})

export type ZakatCalculateBody = z.infer<typeof zakatCalculateSchema>
export type ZakatAssetBody = z.infer<typeof zakatAssetSchema>

// ============================================================
// AZKAR
// ============================================================

export const azkarQuerySchema = z.object({
  category: z
    .enum(['morning', 'evening', 'sleep', 'prayer', 'general'])
    .optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v >= 1, { message: 'page must be >= 1' }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => v >= 1 && v <= 100, { message: 'limit must be between 1 and 100' }),
})

export type AzkarQuery = z.infer<typeof azkarQuerySchema>

// ============================================================
// TASBIH
// ============================================================

export const tasbihSaveSchema = z.object({
  phrase: z.string().min(1).max(200),    // e.g. "SubhanAllah"
  count: z.number().int().positive(),     // how many times pressed
  target: z.number().int().positive().optional().default(33),
  sessionDate: z
    .string()
    .optional()
    .refine(
      (d) => !d || !isNaN(Date.parse(d)),
      { message: 'sessionDate must be a valid ISO date string' }
    ),
})

export type TasbihSaveBody = z.infer<typeof tasbihSaveSchema>

export const tasbihStatsQuerySchema = z.object({
  /**
   * daily  → today's sessions aggregated into a single DailyStats object.
   * weekly → current week (Mon–Sun) with per-day breakdown.
   * Defaults to 'daily' when omitted.
   */
  range: z
    .enum(['daily', 'weekly'], {
      errorMap: () => ({ message: "range must be 'daily' or 'weekly'" }),
    })
    .optional()
    .default('daily'),
})

export type TasbihStatsQuery = z.infer<typeof tasbihStatsQuerySchema>

// ============================================================
// AI ASSISTANT
// ============================================================

export const aiAssistantMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  conversationId: z.string().cuid().optional(),  // omit to start a new conversation
})

export type AiAssistantMessageBody = z.infer<typeof aiAssistantMessageSchema>

// ============================================================
// AI ASSISTANT — HISTORY QUERY
// ============================================================

export const aiHistoryQuerySchema = z.object({
  /** If provided, returns message turns for this conversation; if omitted, returns conversation threads */
  conversationId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined)),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v >= 1, { message: 'page must be >= 1' }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => v >= 1 && v <= 100, { message: 'limit must be between 1 and 100' }),
})

export type AiHistoryQuery = z.infer<typeof aiHistoryQuerySchema>

// ============================================================
// AI ASSISTANT — FEEDBACK
// ============================================================

export const aiAssistantFeedbackSchema = z
  .object({
    /** Identifier for the assistant message / audit log turn (accepts messageId or logId) */
    messageId: z.string().min(1, 'messageId cannot be empty').optional(),
    logId: z.string().min(1, 'logId cannot be empty').optional(),
    /** Rating supports thumbs up/down as well as descriptive ratings */
    rating: z.enum(
      ['thumbs_up', 'thumbs_down', 'helpful', 'not_helpful', 'inappropriate'],
      {
        errorMap: () => ({
          message:
            "rating must be one of: 'thumbs_up', 'thumbs_down', 'helpful', 'not_helpful', 'inappropriate'",
        }),
      },
    ),
    comment: z
      .string()
      .max(500, 'Comment must be 500 characters or fewer')
      .optional()
      .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined)),
  })
  .refine((data) => Boolean(data.messageId || data.logId), {
    message: 'Either messageId or logId must be provided',
    path: ['messageId'],
  })

export type AiAssistantFeedbackBody = z.infer<typeof aiAssistantFeedbackSchema>

// ============================================================
// ZAKAT — HISTORY QUERY
// ============================================================

/** Positive integer query-string helper (rejects "", "abc", "1.5", "0", "-1"). */
const positiveIntQuery = (opts: {
  field: string
  defaultValue: number
  max?: number
}) =>
  z
    .string()
    .optional()
    .default(String(opts.defaultValue))
    .refine((v) => /^\d+$/.test(v), {
      message: `${opts.field} must be a positive integer`,
    })
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 1, { message: `${opts.field} must be >= 1` })
    .refine(
      (v) => (opts.max === undefined ? true : v <= opts.max),
      {
        message:
          opts.max !== undefined
            ? `${opts.field} must be between 1 and ${opts.max}`
            : `${opts.field} is out of range`,
      },
    )

export const zakatHistoryQuerySchema = z.object({
  currency: z
    .string()
    .length(3, 'currency must be a 3-letter ISO 4217 code')
    .regex(/^[A-Za-z]{3}$/, 'currency must be 3 alphabetic characters')
    .transform((v) => v.toUpperCase())
    .optional(),
  page: positiveIntQuery({ field: 'page', defaultValue: 1 }),
  limit: positiveIntQuery({ field: 'limit', defaultValue: 10, max: 50 }),
})

export type ZakatHistoryQuery = z.infer<typeof zakatHistoryQuerySchema>

// ============================================================
// AZKAR — CATEGORY ITEMS QUERY
// ============================================================

export const azkarCategoryParamSchema = z.object({
  categoryId: z.string().min(1, 'categoryId is required'),
})

export const azkarItemParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
})

export const azkarItemsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v >= 1, { message: 'page must be >= 1' }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => v >= 1 && v <= 100, { message: 'limit must be between 1 and 100' }),
  /**
   * Optional case-insensitive substring filter.
   * Matched against arabic text, transliteration, and translation.
   * Blank strings are normalised to undefined (no filter applied).
   */
  search: z
    .string()
    .max(100, 'search must be 100 characters or fewer')
    .optional()
    .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined)),
})

export type AzkarItemsQuery = z.infer<typeof azkarItemsQuerySchema>

// ============================================================
// ADMIN — AI LOGS QUERY
// ============================================================

// ─── Boolean query param helper ─────────────────────────────────────────────
const boolQuery = () =>
  z.enum(['true', 'false'])
    .optional()
    .transform((v) => v === undefined ? undefined : v === 'true')

export const adminAiLogsQuerySchema = z.object({
  // Identity filters
  userId:         z.string().optional(),
  conversationId: z.string().optional(),
  // Behaviour filters
  isRedirected:  boolQuery(),
  isAdversarial: boolQuery(),
  isOutOfScope:  boolQuery(),
  isFlagged:     boolQuery(),
  // Classification filters
  topicCategory: z.enum([
    'PRAYER_WORSHIP', 'FOOD_DRINK', 'FINANCIAL',
    'MARRIAGE_FAMILY', 'GENERAL_RULING', 'ADVERSARIAL',
  ]).optional(),
  errorStatus: z.enum([
    'FIQHI_REDIRECT', 'SCOPE_REJECTED', 'TIMEOUT', 'PROVIDER_ERROR', 'RATE_LIMITED',
  ]).optional(),
  modelUsed: z.string().optional(),
  rating:    z.enum(['helpful', 'not_helpful', 'inappropriate']).optional(),
  role:      z.enum(['USER', 'ASSISTANT']).optional(),
  // Date range (ISO 8601 strings from query params)
  dateFrom: z.string().optional().transform((v) => v ? new Date(v) : undefined),
  dateTo:   z.string().optional().transform((v) => v ? new Date(v) : undefined),
  // Pagination
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v >= 1, { message: 'page must be >= 1' }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => v >= 1 && v <= 100, { message: 'limit must be between 1 and 100' }),
})

export type AdminAiLogsQuery = z.infer<typeof adminAiLogsQuerySchema>

// ============================================================
// AI ASSISTANT — ADMIN INGEST
// ============================================================

export const adminIngestSchema = z.object({
  sourceType: z.enum(['HELP_DOC', 'COURSE_METADATA', 'MARKETPLACE_METADATA', 'FAQ'], {
    errorMap: () => ({
      message: 'sourceType must be one of: HELP_DOC, COURSE_METADATA, MARKETPLACE_METADATA, FAQ',
    }),
  }),
  title: z
    .string()
    .min(3, 'title must be at least 3 characters')
    .max(200, 'title must be 200 characters or fewer'),
  content: z
    .string()
    .min(20, 'content must be at least 20 characters')
    .max(50_000, 'content must be 50,000 characters or fewer'),
  sourceId: z.string().optional(),
  url: z
    .string()
    .url('url must be a valid URL')
    .optional()
    .or(z.string().startsWith('/').optional()),
})

export type AdminIngestBody = z.infer<typeof adminIngestSchema>

// ============================================================
// ADMIN — FLAG CONVERSATION / LOG
// ============================================================

export const flagConversationSchema = z.object({
  isFlagged: z.boolean({ required_error: 'isFlagged (boolean) is required' }),
  reason: z
    .string()
    .max(500, 'Reason must be 500 characters or fewer')
    .optional(),
})

export type FlagConversationBody = z.infer<typeof flagConversationSchema>

export const flagLogSchema = z.object({
  isFlagged: z.boolean({ required_error: 'isFlagged (boolean) is required' }),
})

export type FlagLogBody = z.infer<typeof flagLogSchema>



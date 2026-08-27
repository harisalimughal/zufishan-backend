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

export const qiblaQuerySchema = coordinatesSchema

export type QiblaQuery = z.infer<typeof qiblaQuerySchema>

// ============================================================
// HIJRI DATE
// ============================================================

export const hijriDateQuerySchema = z.object({
  date: z
    .string()
    .optional()
    .refine(
      (d) => !d || !isNaN(Date.parse(d)),
      { message: 'date must be a valid ISO date string (YYYY-MM-DD)' }
    ),
})

export type HijriDateQuery = z.infer<typeof hijriDateQuerySchema>

// ============================================================
// ZAKAT
// ============================================================

export const zakatCalculateSchema = z.object({
  goldGrams: z.number().nonnegative().optional().default(0),
  silverGrams: z.number().nonnegative().optional().default(0),
  cashSavings: z.number().nonnegative().optional().default(0),
  investments: z.number().nonnegative().optional().default(0),
  businessAssets: z.number().nonnegative().optional().default(0),
  receivables: z.number().nonnegative().optional().default(0),
  currency: z.string().length(3).optional().default('USD'),  // ISO 4217 code
})

export type ZakatCalculateBody = z.infer<typeof zakatCalculateSchema>

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

// ============================================================
// AI ASSISTANT
// ============================================================

export const aiAssistantMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  conversationId: z.string().cuid().optional(),  // omit to start a new conversation
})

export type AiAssistantMessageBody = z.infer<typeof aiAssistantMessageSchema>

// ============================================================
// AI ASSISTANT — FEEDBACK
// ============================================================

export const aiAssistantFeedbackSchema = z.object({
  logId: z.string().cuid('Invalid log ID'),
  rating: z.enum(['helpful', 'not_helpful', 'inappropriate']),
  comment: z.string().max(500).optional(),
})

export type AiAssistantFeedbackBody = z.infer<typeof aiAssistantFeedbackSchema>

// ============================================================
// ZAKAT — HISTORY QUERY
// ============================================================

export const zakatHistoryQuerySchema = z.object({
  currency: z.string().length(3).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v >= 1, { message: 'page must be >= 1' }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .refine((v) => v >= 1 && v <= 50, { message: 'limit must be between 1 and 50' }),
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
})

// ============================================================
// ADMIN — AI LOGS QUERY
// ============================================================

export const adminAiLogsQuerySchema = z.object({
  userId: z.string().optional(),
  modelUsed: z.string().optional(),
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

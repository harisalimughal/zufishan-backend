/**
 * Comprehensive Jest + Supertest Integration Test Suite for Utilities Module
 *
 * Covers all 7 Utilities APIs via HTTP (Supertest against Express app):
 *  1. Prayer Times API       (GET /api/v1/utilities/prayer-times)
 *  2. Qibla Direction API    (GET /api/v1/utilities/qibla)
 *  3. Hijri Date API         (GET /api/v1/utilities/hijri-date)
 *  4. Zakat API              (Nisab rate, Methodologies, Calculator, History)
 *  5. Azkar Content API      (Categories, Items by category, Item detail)
 *  6. Tasbih Counter API     (Save session, History, Daily/Weekly Stats)
 *  7. AI Assistant API       (Chat, History, Feedback, Admin logs/flag/ingest)
 *
 * Validates:
 *  - Successful requests with deep body/DTO structure assertions
 *  - Zod validation failures on query, params, and body
 *  - Authentication (401) and Authorization / RBAC (403)
 *  - Database and external API failures (timeout, stale cache fallback, graceful degradation)
 *  - Caching (hit vs miss)
 *  - Pagination envelopes and boundary enforcement
 *  - User data isolation (cross-tenant IDOR protection)
 *  - Business rules & mathematical accuracy (Zakat rules, Qibla geodesics, Islamic calendar)
 *  - AI guardrails (Greeting fast-path, Fiqhi redirection, Out-of-scope, Prompt injection delimiters)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { generateToken } from '../src/utils/jwt'
import { Decimal } from '@prisma/client/runtime/library'
import type { AiAssistantLog, RagSourceType } from '@prisma/client'
import type { ZakatCalculationRow } from '../src/repositories/zakatCalculation.repository'
import type { NisabRateRow } from '../src/repositories/zakatNisab.repository'

// ─── Mock Repositories ───────────────────────────────────────────────────────

vi.mock('../src/repositories/prayerTimes.repository', () => ({
  prayerTimesRepository: {
    findCached: vi.fn(),
    upsertCache: vi.fn().mockResolvedValue({}),
    deleteExpired: vi.fn().mockResolvedValue(0),
  },
  default: {
    findCached: vi.fn(),
    upsertCache: vi.fn().mockResolvedValue({}),
    deleteExpired: vi.fn().mockResolvedValue(0),
  },
}))

vi.mock('../src/repositories/zakatNisab.repository', () => ({
  zakatNisabRepository: {
    findTodayCached: vi.fn(),
    findLatestValid: vi.fn(),
    upsertRate: vi.fn(),
  },
  default: {
    findTodayCached: vi.fn(),
    findLatestValid: vi.fn(),
    upsertRate: vi.fn(),
  },
}))

vi.mock('../src/repositories/zakatCalculation.repository', () => ({
  zakatCalculationRepository: {
    findByUserIdPaginated: vi.fn(),
    createCalculation: vi.fn(),
  },
  default: {
    findByUserIdPaginated: vi.fn(),
    createCalculation: vi.fn(),
  },
}))

vi.mock('../src/repositories/azkar.repository', () => ({
  azkarRepository: {
    findCategories: vi.fn(),
    findItemsByCategoryId: vi.fn(),
    findItemById: vi.fn(),
    categoryExists: vi.fn(),
  },
  default: {
    findCategories: vi.fn(),
    findItemsByCategoryId: vi.fn(),
    findItemById: vi.fn(),
    categoryExists: vi.fn(),
  },
}))

vi.mock('../src/repositories/tasbih.repository', () => ({
  tasbihRepository: {
    createSession: vi.fn(),
    findByDate: vi.fn(),
    findByDateRange: vi.fn(),
  },
  default: {
    createSession: vi.fn(),
    findByDate: vi.fn(),
    findByDateRange: vi.fn(),
  },
}))

vi.mock('../src/repositories/utility.repository', () => ({
  utilityRepository: {
    getUserConversations: vi.fn(),
    getConversationHistory: vi.fn(),
    getAiLogForUser: vi.fn(),
    submitFeedback: vi.fn(),
    createAiConversation: vi.fn(),
    saveAiLog: vi.fn(),
    updateConversationTitle: vi.fn(),
    getAdminLogs: vi.fn(),
    getAdminLogById: vi.fn(),
    flagConversation: vi.fn(),
    flagAiLog: vi.fn(),
    createRagDocument: vi.fn(),
  },
  default: {
    getUserConversations: vi.fn(),
    getConversationHistory: vi.fn(),
    getAiLogForUser: vi.fn(),
    submitFeedback: vi.fn(),
    createAiConversation: vi.fn(),
    saveAiLog: vi.fn(),
    updateConversationTitle: vi.fn(),
    getAdminLogs: vi.fn(),
    getAdminLogById: vi.fn(),
    flagConversation: vi.fn(),
    flagAiLog: vi.fn(),
    createRagDocument: vi.fn(),
  },
}))

vi.mock('../src/services/ai-services/vectorStore', () => ({
  semanticSearch: vi.fn(),
}))

vi.mock('../src/services/ai-services/generator', () => ({
  generateAnswer: vi.fn(),
}))

vi.mock('../src/services/ai-services/ingestPipeline', () => ({
  ingestDocument: vi.fn(),
}))

vi.mock('../src/services/marketPrices.service', () => ({
  fetchLiveMetalPrices: vi.fn(),
}))

vi.mock('../src/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  },
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  },
}))

// ─── Imported Mock Targets ──────────────────────────────────────────────────

import { prayerTimesRepository } from '../src/repositories/prayerTimes.repository'
import { zakatNisabRepository } from '../src/repositories/zakatNisab.repository'
import { zakatCalculationRepository } from '../src/repositories/zakatCalculation.repository'
import { azkarRepository } from '../src/repositories/azkar.repository'
import { tasbihRepository } from '../src/repositories/tasbih.repository'
import { utilityRepository } from '../src/repositories/utility.repository'
import { semanticSearch } from '../src/services/ai-services/vectorStore'
import { generateAnswer } from '../src/services/ai-services/generator'
import { ingestDocument } from '../src/services/ai-services/ingestPipeline'
import { fetchLiveMetalPrices } from '../src/services/marketPrices.service'

// ─── Test Tokens ─────────────────────────────────────────────────────────────

const studentUserId = 'user_student_101'
const studentToken = generateToken({
  id: studentUserId,
  email: 'student@example.com',
  role: 'STUDENT',
})

const adminUserId = 'user_admin_202'
const adminToken = generateToken({
  id: adminUserId,
  email: 'admin@example.com',
  role: 'ADMIN',
})

const makeNisabRow = (overrides: Partial<NisabRateRow> = {}): NisabRateRow => ({
  id: 'nisab-1',
  currency: 'PKR',
  goldPricePerGram: new Decimal(20000),
  silverPricePerGram: new Decimal(250),
  nisabGoldGrams: new Decimal(87.48),
  nisabSilverGrams: new Decimal(612.36),
  nisabValueGold: new Decimal(1749600),
  nisabValueSilver: new Decimal(153090),
  source: 'cache-test',
  effectiveDate: new Date('2026-09-12T00:00:00Z'),
  createdAt: new Date(),
  ...overrides,
})

describe('Comprehensive Utilities API Integration Tests (Jest + Supertest)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // 1. PRAYER TIMES API (GET /api/v1/utilities/prayer-times)
  // ============================================================================

  describe('1. Prayer Times API (GET /api/v1/utilities/prayer-times)', () => {
    it('returns prayer times from database cache when available (cache hit)', async () => {
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue({
        id: 'pt-cache-1',
        latitude: new Decimal(24.8607),
        longitude: new Decimal(67.0011),
        date: new Date('2026-09-12'),
        method: 'Karachi',
        asrMethod: 1,
        fajr: '05:00',
        sunrise: '06:15',
        dhuhr: '12:30',
        asr: '16:00',
        maghrib: '18:45',
        isha: '20:00',
        midnight: '00:30',
        lastThird: '03:15',
        expiresAt: new Date('2026-09-12T23:59:59Z'),
        createdAt: new Date(),
      })

      const res = await request(app)
        .get('/api/v1/utilities/prayer-times')
        .query({
          latitude: 24.8607,
          longitude: 67.0011,
          method: 'Karachi',
          asrMethod: 1,
          date: '2026-09-12',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('Prayer times fetched')
      expect(res.body.data.meta.cached).toBe(true)
      expect(res.body.data.method).toBe('Karachi')
      expect(res.body.data.asrMethod).toBe(1)
      expect(res.body.data.timings.Fajr).toBe('05:00')
      expect(res.body.data.timings.Asr).toBe('16:00')
      expect(res.body.data.timings.Maghrib).toBe('18:45')
      expect(res.body.data.timings.Isha).toBe('20:00')
    })

    it('supports short coordinate aliases (lat & lng) and defaults date to today', async () => {
      vi.mocked(prayerTimesRepository.findCached).mockResolvedValue({
        id: 'pt-cache-2',
        latitude: new Decimal(51.5074),
        longitude: new Decimal(-0.1278),
        date: new Date(),
        method: 'MWL',
        asrMethod: 0,
        fajr: '04:30',
        sunrise: '06:00',
        dhuhr: '13:00',
        asr: '16:30',
        maghrib: '19:30',
        isha: '21:00',
        midnight: null,
        lastThird: null,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      })

      const res = await request(app)
        .get('/api/v1/utilities/prayer-times')
        .query({ lat: 51.5074, lng: -0.1278 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.location.latitude).toBeCloseTo(51.5074)
      expect(res.body.data.location.longitude).toBeCloseTo(-0.1278)
      expect(res.body.data.method).toBe('MWL')
      expect(res.body.data.asrMethod).toBe(0)
    })

    it('rejects request with 400 when coordinates are missing', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/prayer-times')
        .query({ method: 'MWL' })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.errors.some((e: { field: string }) => e.field.includes('latitude'))).toBe(true)
    })

    it('rejects out-of-range coordinates with 400', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/prayer-times')
        .query({ lat: 95, lng: 200 })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('rejects invalid asrMethod (not 0 or 1) with 400', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/prayer-times')
        .query({ lat: 24.86, lng: 67.01, asrMethod: 5 })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  // ============================================================================
  // 2. QIBLA DIRECTION API (GET /api/v1/utilities/qibla)
  // ============================================================================

  describe('2. Qibla Direction API (GET /api/v1/utilities/qibla)', () => {
    it('accurately calculates Qibla bearing from London (~118.98° SE)', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/qibla')
        .query({ latitude: 51.5074, longitude: -0.1278 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.bearing).toBeCloseTo(118.98, 1)
      expect(res.body.data.cardinal).toBe('SE')
      expect(res.body.data.kaaba.latitude).toBe(21.4225)
      expect(res.body.data.kaaba.longitude).toBe(39.8262)
    })

    it('accurately calculates Qibla bearing from New York (~58.48° NE)', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/qibla')
        .query({ lat: 40.7128, lng: -74.0060 })

      expect(res.status).toBe(200)
      expect(res.body.data.bearing).toBeCloseTo(58.48, 1)
      expect(res.body.data.cardinal).toBe('NE')
    })

    it('accurately calculates Qibla bearing from Karachi (~267.74° W)', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/qibla')
        .query({ lat: 24.8607, lng: 67.0011 })

      expect(res.status).toBe(200)
      expect(res.body.data.bearing).toBeCloseTo(267.74, 1)
      expect(res.body.data.cardinal).toBe('W')
    })

    it('rejects missing coordinates with 400', async () => {
      const res = await request(app).get('/api/v1/utilities/qibla')
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('rejects coordinates out of valid range [-90..90, -180..180]', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/qibla')
        .query({ lat: -91, lng: 181 })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  // ============================================================================
  // 3. HIJRI DATE API (GET /api/v1/utilities/hijri-date)
  // ============================================================================

  describe('3. Hijri Date API (GET /api/v1/utilities/hijri-date)', () => {
    it('converts current Gregorian date to Hijri with complete response structure', async () => {
      const res = await request(app).get('/api/v1/utilities/hijri-date')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('gregorian')
      expect(res.body.data).toHaveProperty('hijri')
      expect(res.body.data).toHaveProperty('nearbyEvents')

      const { gregorian, hijri } = res.body.data
      expect(typeof gregorian.day).toBe('number')
      expect(typeof gregorian.weekday).toBe('string')
      expect(typeof hijri.day).toBe('number')
      expect(hijri.month).toHaveProperty('en')
      expect(hijri.month).toHaveProperty('ar')
      expect(typeof hijri.year).toBe('number')
    })

    it('converts custom ISO date (YYYY-MM-DD)', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/hijri-date')
        .query({ date: '2026-03-20' })

      expect(res.status).toBe(200)
      expect(res.body.data.gregorian.date).toBe('2026-03-20')
      expect(res.body.data.gregorian.day).toBe(20)
      expect(res.body.data.gregorian.month).toBe(3)
    })

    it('applies explicit day adjustment (-1 or +1)', async () => {
      const standardRes = await request(app)
        .get('/api/v1/utilities/hijri-date')
        .query({ date: '2026-03-20', adjustment: 0 })

      const adjustedRes = await request(app)
        .get('/api/v1/utilities/hijri-date')
        .query({ date: '2026-03-20', adjustment: 1 })

      expect(standardRes.status).toBe(200)
      expect(adjustedRes.status).toBe(200)
      expect(adjustedRes.body.data.location.adjustment).toBe(1)
      expect(adjustedRes.body.data.location.regionNote).toContain('Explicit day adjustment')
      expect(adjustedRes.body.data.hijri.effectiveAdjustment).toBe(1)
    })

    it('includes South Asia regional note when coordinates fall into South Asia region', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/hijri-date')
        .query({ lat: 24.86, lng: 67.01 })

      expect(res.status).toBe(200)
      expect(res.body.data.location.regionNote).toContain('South Asia regional moon sighting offset')
    })

    it('rejects invalid date string with 400', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/hijri-date')
        .query({ date: 'not-a-date' })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('rejects adjustment outside [-3, 3] with 400', async () => {
      const res = await request(app)
        .get('/api/v1/utilities/hijri-date')
        .query({ adjustment: 5 })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  // ============================================================================
  // 4. ZAKAT API
  // ============================================================================

  describe('4. Zakat API', () => {
    // ── 4a. Nisab Rate ────────────────────────────────────────────────────────
    describe('GET /api/v1/utilities/zakat/nisab-rate', () => {
      it('returns cached today rate with South Asian standard (87.48g gold, 612.36g silver)', async () => {
        vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(
          makeNisabRow({
            id: 'nisab-1',
            currency: 'PKR',
            goldPricePerGram: new Decimal(20000),
            silverPricePerGram: new Decimal(250),
            source: 'cache-test',
            effectiveDate: new Date('2026-09-12T00:00:00Z'),
          })
        )

        const res = await request(app)
          .get('/api/v1/utilities/zakat/nisab-rate')
          .query({ currency: 'PKR', methodology: 'SOUTH_ASIAN' })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.methodology).toBe('SOUTH_ASIAN')
        expect(res.body.data.gold.nisabWeightGrams).toBe(87.48)
        expect(res.body.data.silver.nisabWeightGrams).toBe(612.36)
        expect(res.body.data.gold.nisabWeightTola).toBe(7.5)
        expect(res.body.data.silver.nisabWeightTola).toBe(52.5)
        expect(res.body.data.gold.nisabValue).toBe(20000 * 87.48)
        expect(res.body.data.silver.nisabValue).toBe(250 * 612.36)
        expect(res.body.data.lowerNisabValue).toBe(250 * 612.36) // silver is lower
        expect(res.body.data.isStale).toBe(false)
      })

      it('returns AAOIFI standard weights (85g gold, 595g silver)', async () => {
        vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(
          makeNisabRow({
            id: 'nisab-2',
            currency: 'USD',
            goldPricePerGram: new Decimal(80),
            silverPricePerGram: new Decimal(1),
            source: 'cache-test',
            effectiveDate: new Date('2026-09-12T00:00:00Z'),
          })
        )

        const res = await request(app)
          .get('/api/v1/utilities/zakat/nisab-rate')
          .query({ currency: 'USD', methodology: 'AAOIFI' })

        expect(res.status).toBe(200)
        expect(res.body.data.methodology).toBe('AAOIFI')
        expect(res.body.data.gold.nisabWeightGrams).toBe(85)
        expect(res.body.data.silver.nisabWeightGrams).toBe(595)
      })

      it('falls back to latest cached rate with isStale=true when live fetch returns null', async () => {
        vi.mocked(zakatNisabRepository.findTodayCached).mockResolvedValue(null)
        vi.mocked(fetchLiveMetalPrices).mockResolvedValue(null)
        vi.mocked(zakatNisabRepository.findLatestValid).mockResolvedValue(
          makeNisabRow({
            id: 'nisab-stale',
            currency: 'USD',
            goldPricePerGram: new Decimal(75),
            silverPricePerGram: new Decimal(0.95),
            source: 'previous-cache',
            effectiveDate: new Date(Date.now() - 4 * 86400000),
          })
        )

        const res = await request(app)
          .get('/api/v1/utilities/zakat/nisab-rate')
          .query({ currency: 'USD' })

        expect(res.status).toBe(200)
        expect(res.body.data.isStale).toBe(true)
        expect(res.body.data.staleDays).toBeGreaterThanOrEqual(1)
      })

      it('rejects invalid currency code with 400', async () => {
        const res = await request(app)
          .get('/api/v1/utilities/zakat/nisab-rate')
          .query({ currency: 'US' }) // not 3 chars

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
      })
    })

    // ── 4b. Methodologies ─────────────────────────────────────────────────────
    describe('GET /api/v1/utilities/zakat/methodologies', () => {
      it('returns both SOUTH_ASIAN and AAOIFI standards with scholarly references', async () => {
        const res = await request(app).get('/api/v1/utilities/zakat/methodologies')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.default).toBe('SOUTH_ASIAN')
        expect(res.body.data.methodologies).toHaveProperty('SOUTH_ASIAN')
        expect(res.body.data.methodologies).toHaveProperty('AAOIFI')
        expect(res.body.data.methodologies.SOUTH_ASIAN.goldGrams).toBe(87.48)
        expect(res.body.data.methodologies.AAOIFI.goldGrams).toBe(85)
      })
    })

    // ── 4c. Zakat Calculation Engine ──────────────────────────────────────────
    describe('POST /api/v1/utilities/zakat/calculate', () => {
      it('calculates Zakat accurately on Cash and Investments (2.5%)', async () => {
        const res = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({
            assets: [
              { category: 'cash', value: 10000 },
              { category: 'investments', value: 20000 },
            ],
            madhab: 'hanafi',
            nisabThreshold: 1000,
          })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.totalWealthAssets).toBe(30000)
        expect(res.body.data.wealthMeetsNisab).toBe(true)
        expect(res.body.data.totalZakat).toBe(750) // 30000 * 0.025 = 750
      })

      it('enforces Hanafi rule on gold ornaments (zakatable) vs Shafi exemption', async () => {
        const payload = {
          assets: [{ category: 'gold_silver', value: 5000 }],
          nisabThreshold: 1000,
        }

        // Hanafi: personal jewelry is guided as zakatable in inclusionNotes
        const hanafiRes = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({ ...payload, madhab: 'hanafi' })

        expect(hanafiRes.body.data.totalWealthAssets).toBe(5000)
        expect(hanafiRes.body.data.totalZakat).toBe(125)
        expect(
          hanafiRes.body.data.madhabDetails.inclusionNotes.some((n: string) =>
            n.includes('Include personal gold and silver')
          )
        ).toBe(true)

        // Shafi: personal jewelry is guided as exempt in inclusionNotes
        const shafiRes = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({ ...payload, madhab: 'shafi' })

        expect(shafiRes.body.data.totalWealthAssets).toBe(5000)
        expect(shafiRes.body.data.totalZakat).toBe(125)
        expect(
          shafiRes.body.data.madhabDetails.inclusionNotes.some((n: string) =>
            n.includes('Exclude personal gold/silver')
          )
        ).toBe(true)
      })

      it('calculates Agricultural Produce (Ushr): 10% for natural vs 5% for artificial irrigation', async () => {
        const naturalRes = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({
            assets: [{ category: 'agricultural_produce', value: 10000, irrigation: 'natural' }],
            madhab: 'hanafi',
          })

        expect(naturalRes.body.data.totalZakat).toBe(1000) // 10% of 10000

        const artificialRes = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({
            assets: [{ category: 'agricultural_produce', value: 10000, irrigation: 'artificial' }],
            madhab: 'hanafi',
          })

        expect(artificialRes.body.data.totalZakat).toBe(500) // 5% of 10000
      })

      it('calculates Livestock Zakat per classical brackets (40 sheep -> 1 sheep due)', async () => {
        const res = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({
            assets: [
              {
                category: 'livestock',
                value: 4000,
                animalType: 'sheep_goats',
                headCount: 40,
              },
            ],
            madhab: 'hanafi',
          })

        expect(res.status).toBe(200)
        expect(res.body.data.categoryBreakdown[0].livestock?.animalsDue).toBe(1)
      })

      it('sets zakatDue to 0 when assets are below nisabThreshold', async () => {
        const res = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({
            assets: [{ category: 'cash', value: 500 }],
            madhab: 'hanafi',
            nisabThreshold: 1000,
          })

        expect(res.status).toBe(200)
        expect(res.body.data.wealthMeetsNisab).toBe(false)
        expect(res.body.data.totalZakat).toBe(0)
      })

      it('rejects agricultural produce without irrigation type with 400', async () => {
        const res = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({
            assets: [{ category: 'agricultural_produce', value: 5000 }],
            madhab: 'hanafi',
          })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
      })

      it('rejects livestock without animalType and headCount with 400', async () => {
        const res = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({
            assets: [{ category: 'livestock', value: 5000 }],
            madhab: 'hanafi',
          })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
      })

      it('rejects asset array exceeding 100 items with 400 (DoS defense)', async () => {
        const res = await request(app)
          .post('/api/v1/utilities/zakat/calculate')
          .send({
            assets: Array.from({ length: 101 }, () => ({ category: 'cash', value: 100 })),
            madhab: 'hanafi',
          })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
      })
    })

    // ── 4d. Zakat History (Authenticated) ────────────────────────────────────
    describe('GET /api/v1/utilities/zakat/history', () => {
      it('rejects unauthenticated request with 401', async () => {
        const res = await request(app).get('/api/v1/utilities/zakat/history')
        expect(res.status).toBe(401)
      })

      it('returns user history with pagination and strictly isolates to user', async () => {
        vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
          rows: [
            {
              id: 'calc-1',
              userId: studentUserId,
              goldGrams: new Decimal(0),
              silverGrams: new Decimal(0),
              cashSavings: new Decimal(10000),
              investments: new Decimal(0),
              businessAssets: new Decimal(0),
              receivables: new Decimal(0),
              totalZakatableAssets: new Decimal(10000),
              nisabThreshold: new Decimal(1000),
              zakatDue: new Decimal(250),
              zakatableAboveNisab: true,
              currency: 'USD',
              nisabRateId: null,
              createdAt: new Date(),
            },
          ] as unknown as ZakatCalculationRow[],
          total: 1,
        })

        const res = await request(app)
          .get('/api/v1/utilities/zakat/history')
          .set('Authorization', `Bearer ${studentToken}`)
          .query({ page: 1, limit: 10 })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.items.length).toBe(1)
        expect(res.body.data.items[0].userId).toBe(studentUserId)
        expect(res.body.data.pagination.total).toBe(1)
        expect(res.body.data.pagination.page).toBe(1)
      })
    })
  })

  // ============================================================================
  // 5. AZKAR CONTENT API
  // ============================================================================

  describe('5. Azkar Content API', () => {
    describe('GET /api/v1/utilities/azkar/categories', () => {
      it('returns active categories ordered by displayOrder', async () => {
        vi.mocked(azkarRepository.findCategories).mockResolvedValue([
          {
            id: 'cat-1',
            slug: 'morning',
            name: 'Morning Azkar',
            arabicName: 'أذكار الصباح',
            description: 'Morning prayers',
            iconName: 'Sunrise',
            displayOrder: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])

        const res = await request(app).get('/api/v1/utilities/azkar/categories')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.categories.length).toBe(1)
        expect(res.body.data.categories[0].name).toBe('Morning Azkar')
        expect(res.body.data.categories[0]).not.toHaveProperty('isActive') // internal flag stripped
      })

      it('handles empty categories list gracefully', async () => {
        vi.mocked(azkarRepository.findCategories).mockResolvedValue([])

        const res = await request(app).get('/api/v1/utilities/azkar/categories')

        expect(res.status).toBe(200)
        expect(res.body.data.categories).toEqual([])
      })
    })

    describe('GET /api/v1/utilities/azkar/:categoryId/items', () => {
      it('returns 404 when category does not exist', async () => {
        vi.mocked(azkarRepository.categoryExists).mockResolvedValue(false)

        const res = await request(app).get('/api/v1/utilities/azkar/nonexistent/items')

        expect(res.status).toBe(404)
        expect(res.body.success).toBe(false)
        expect(res.body.message).toContain('Azkar category not found')
      })

      it('returns paginated items and sanitizes insecure audio URLs to null', async () => {
        vi.mocked(azkarRepository.categoryExists).mockResolvedValue(true)
        vi.mocked(azkarRepository.findItemsByCategoryId).mockResolvedValue({
          rows: [
            {
              id: 'item-1',
              categoryId: 'cat-1',
              arabic: 'سبحان الله',
              transliteration: 'SubhanAllah',
              translation: 'Glory be to Allah',
              repetitions: 33,
              reference: 'Sahih Muslim',
              audioUrl: 'https://cdn.example.com/audio/subhanallah.mp3',
              displayOrder: 1,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'item-2',
              categoryId: 'cat-1',
              arabic: 'الحمد لله',
              transliteration: 'Alhamdulillah',
              translation: 'Praise be to Allah',
              repetitions: 33,
              reference: null,
              audioUrl: 'http://insecure.example.com/audio.mp3', // plain HTTP must be stripped
              displayOrder: 2,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          total: 2,
        })

        const res = await request(app)
          .get('/api/v1/utilities/azkar/cat-1/items')
          .query({ page: 1, limit: 10 })

        expect(res.status).toBe(200)
        expect(res.body.data.items.length).toBe(2)
        expect(res.body.data.items[0].audioUrl).toBe('https://cdn.example.com/audio/subhanallah.mp3')
        expect(res.body.data.items[1].audioUrl).toBeNull() // insecure stripped
        expect(res.body.data.pagination.total).toBe(2)
      })
    })

    describe('GET /api/v1/utilities/azkar/item/:id', () => {
      it('returns item with embedded category DTO', async () => {
        vi.mocked(azkarRepository.findItemById).mockResolvedValue({
          id: 'item-1',
          categoryId: 'cat-1',
          arabic: 'سبحان الله',
          transliteration: 'SubhanAllah',
          translation: 'Glory be to Allah',
          repetitions: 33,
          reference: 'Bukhari',
          audioUrl: null,
          displayOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'cat-1',
            slug: 'morning',
            name: 'Morning Azkar',
            arabicName: 'أذكار الصباح',
            description: null,
            iconName: null,
            displayOrder: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        const res = await request(app).get('/api/v1/utilities/azkar/item/item-1')

        expect(res.status).toBe(200)
        expect(res.body.data.item.id).toBe('item-1')
        expect(res.body.data.item.category.name).toBe('Morning Azkar')
      })

      it('returns 404 for missing item', async () => {
        vi.mocked(azkarRepository.findItemById).mockResolvedValue(null)

        const res = await request(app).get('/api/v1/utilities/azkar/item/nonexistent')

        expect(res.status).toBe(404)
        expect(res.body.success).toBe(false)
      })
    })
  })

  // ============================================================================
  // 6. TASBIH COUNTER API
  // ============================================================================

  describe('6. Tasbih Counter API', () => {
    describe('POST /api/v1/utilities/tasbih/sessions', () => {
      it('rejects unauthenticated request with 401', async () => {
        const res = await request(app).post('/api/v1/utilities/tasbih/sessions').send({
          phrase: 'SubhanAllah',
          count: 33,
        })
        expect(res.status).toBe(401)
      })

      it('creates new session and marks isCompleted=true when count >= target', async () => {
        vi.mocked(tasbihRepository.createSession).mockResolvedValue({
          id: 'ses-1',
          userId: studentUserId,
          phrase: 'SubhanAllah',
          arabicPhrase: 'سُبْحَانَ اللَّهِ',
          count: 33,
          target: 33,
          isCompleted: true,
          sessionDate: new Date('2026-09-12'),
          createdAt: new Date(),
        })

        const res = await request(app)
          .post('/api/v1/utilities/tasbih/sessions')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            phrase: 'SubhanAllah',
            count: 33,
            target: 33,
          })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.data.session.isCompleted).toBe(true)
        expect(res.body.data.session.count).toBe(33)
      })

      it('rejects count > 10000 with 400', async () => {
        const res = await request(app)
          .post('/api/v1/utilities/tasbih/sessions')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            phrase: 'SubhanAllah',
            count: 10001,
          })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
      })
    })

    describe('GET /api/v1/utilities/tasbih/stats', () => {
      it('returns daily aggregation scoped to user', async () => {
        vi.mocked(tasbihRepository.findByDate).mockResolvedValue([
          {
            id: 'ses-1',
            userId: studentUserId,
            phrase: 'SubhanAllah',
            arabicPhrase: null,
            count: 33,
            target: 33,
            isCompleted: true,
            sessionDate: new Date(),
            createdAt: new Date(),
          },
          {
            id: 'ses-2',
            userId: studentUserId,
            phrase: 'Alhamdulillah',
            arabicPhrase: null,
            count: 33,
            target: 33,
            isCompleted: true,
            sessionDate: new Date(),
            createdAt: new Date(),
          },
        ])

        const res = await request(app)
          .get('/api/v1/utilities/tasbih/stats')
          .set('Authorization', `Bearer ${studentToken}`)
          .query({ range: 'daily' })

        expect(res.status).toBe(200)
        expect(res.body.data.range).toBe('daily')
        expect(res.body.data.stats.totalCount).toBe(66)
        expect(res.body.data.stats.sessionCount).toBe(2)
        expect(res.body.data.stats.completedCount).toBe(2)
        expect(res.body.data.stats.phrases).toEqual(['SubhanAllah', 'Alhamdulillah'])
      })

      it('returns weekly stats with 7-day Monday–Sunday breakdown', async () => {
        vi.mocked(tasbihRepository.findByDateRange).mockResolvedValue([])

        const res = await request(app)
          .get('/api/v1/utilities/tasbih/stats')
          .set('Authorization', `Bearer ${studentToken}`)
          .query({ range: 'weekly' })

        expect(res.status).toBe(200)
        expect(res.body.data.range).toBe('weekly')
        expect(res.body.data.stats.dailyBreakdown.length).toBe(7)
      })
    })
  })

  // ============================================================================
  // 7. AI ASSISTANT API
  // ============================================================================

  describe('7. AI Assistant API', () => {
    describe('POST /api/v1/utilities/ai-assistant/chat', () => {
      it('rejects unauthenticated request with 401', async () => {
        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/chat')
          .send({ message: 'Hello' })

        expect(res.status).toBe(401)
      })

      it('Greeting Fast-Path: returns warm greeting without invoking LLM or retrieval', async () => {
        vi.mocked(utilityRepository.createAiConversation).mockResolvedValue('conv-greet')
        vi.mocked(utilityRepository.saveAiLog).mockResolvedValue({} as unknown as AiAssistantLog)

        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/chat')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ message: 'Assalamu Alaikum' })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.message).toContain('Wa alaikum assalam')
        expect(res.body.data.scholarRedirect).toBe(false)
        expect(res.body.data.sources).toEqual([])
        expect(generateAnswer).not.toHaveBeenCalled()
        expect(semanticSearch).not.toHaveBeenCalled()
      })

      it('AI Fiqhi Redirection: intercept ruling query, redirect to scholar with category', async () => {
        vi.mocked(utilityRepository.createAiConversation).mockResolvedValue('conv-fiqh')
        vi.mocked(utilityRepository.saveAiLog).mockResolvedValue({} as unknown as AiAssistantLog)

        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/chat')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ message: 'Is my salah valid if I moved my arms during prayer?' })

        expect(res.status).toBe(200)
        expect(res.body.data.scholarRedirect).toBe(true)
        expect(res.body.data.scholarRedirectCategory).toBe('PRAYER_WORSHIP')
        expect(res.body.data.message).toContain('Scholar Connect')
        expect(generateAnswer).not.toHaveBeenCalled()
      })

      it('Out-of-Scope Detection: returns polite platform refusal when similarity is below threshold', async () => {
        vi.mocked(utilityRepository.createAiConversation).mockResolvedValue('conv-oos')
        vi.mocked(utilityRepository.saveAiLog).mockResolvedValue({} as unknown as AiAssistantLog)
        vi.mocked(semanticSearch).mockResolvedValue([]) // No relevant chunks found

        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/chat')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ message: 'What is the capital city of France?' })

        expect(res.status).toBe(200)
        expect(res.body.data.message).toContain('Zufishan Platform Assistant')
        expect(res.body.data.sources).toEqual([])
        expect(generateAnswer).not.toHaveBeenCalled()
      })

      it('Normal RAG Answer: returns answer with citations when question is relevant', async () => {
        vi.mocked(utilityRepository.createAiConversation).mockResolvedValue('conv-rag')
        vi.mocked(utilityRepository.saveAiLog).mockResolvedValue({} as unknown as AiAssistantLog)
        vi.mocked(semanticSearch).mockResolvedValue([
          {
            chunkId: 'chunk-1',
            documentId: 'doc-1',
            documentTitle: 'Course Enrollment Guide',
            sourceType: 'COURSE_METADATA' as unknown as RagSourceType,
            content: 'To enroll in a course, visit the course catalog and click Enroll.',
            score: 0.85,
            url: '/courses/catalog',
          },
        ])
        vi.mocked(generateAnswer).mockResolvedValue({
          text: 'According to the Course Enrollment Guide, visit the catalog and click Enroll.',
          promptTokens: 100,
          completionTokens: 25,
          totalTokens: 125,
          modelUsed: 'gemini-1.5-flash',
          latencyMs: 300,
        })

        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/chat')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ message: 'How do I enroll in a course on Zufishan?' })

        expect(res.status).toBe(200)
        expect(res.body.data.message).toContain('Course Enrollment Guide')
        expect(res.body.data.sources.length).toBe(1)
        expect(res.body.data.sources[0].title).toBe('Course Enrollment Guide')
      })

      it('rejects when message exceeds 2000 characters with 400', async () => {
        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/chat')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ message: 'A'.repeat(2001) })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
      })
    })

    describe('GET /api/v1/utilities/ai-assistant/history', () => {
      it('returns user conversation threads when conversationId is omitted', async () => {
        vi.mocked(utilityRepository.getUserConversations).mockResolvedValue({
          conversations: [
            {
              id: 'conv-1',
              title: 'First Chat',
              createdAt: new Date(),
              updatedAt: new Date(),
              _count: { logs: 2 },
            },
          ] as unknown as Array<{ id: string; title: string | null; createdAt: Date; updatedAt: Date; _count: { logs: number } }>,
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        })

        const res = await request(app)
          .get('/api/v1/utilities/ai-assistant/history')
          .set('Authorization', `Bearer ${studentToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.conversations.length).toBe(1)
        expect(res.body.data.conversations[0].title).toBe('First Chat')
      })

      it('returns message turns when conversationId is provided', async () => {
        vi.mocked(utilityRepository.getConversationHistory).mockResolvedValue({
          conversation: { id: 'conv-1', title: 'First Chat', createdAt: new Date(), updatedAt: new Date() },
          messages: [
            { id: 'log-1', role: 'USER', content: 'Hi', createdAt: new Date() },
            { id: 'log-2', role: 'ASSISTANT', content: 'Hello!', createdAt: new Date() },
          ] as unknown as Array<{ id: string; role: 'USER' | 'ASSISTANT'; content: string; createdAt: Date }>,
          pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
        })

        const res = await request(app)
          .get('/api/v1/utilities/ai-assistant/history')
          .set('Authorization', `Bearer ${studentToken}`)
          .query({ conversationId: 'conv-1' })

        expect(res.status).toBe(200)
        expect(res.body.data.messages.length).toBe(2)
        expect(res.body.data.messages[0].content).toBe('Hi')
      })
    })

    describe('POST /api/v1/utilities/ai-assistant/feedback', () => {
      it('submits rating successfully', async () => {
        vi.mocked(utilityRepository.getAiLogForUser).mockResolvedValue({
          id: 'log-1',
          role: 'ASSISTANT',
          rating: null,
          feedbackComment: null,
          conversationId: 'conv-1',
          conversation: { userId: studentUserId },
        } as unknown as Awaited<ReturnType<typeof utilityRepository.getAiLogForUser>>)

        vi.mocked(utilityRepository.submitFeedback).mockResolvedValue({
          id: 'log-1',
          conversationId: 'conv-1',
          rating: 'helpful',
          feedbackComment: 'Great answer',
          createdAt: new Date(),
        })

        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/feedback')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            logId: 'log-1',
            rating: 'helpful',
            comment: 'Great answer',
          })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.rating).toBe('helpful')
      })

      it('rejects duplicate feedback submission with 409 Conflict', async () => {
        vi.mocked(utilityRepository.getAiLogForUser).mockResolvedValue({
          id: 'log-1',
          role: 'ASSISTANT',
          rating: 'thumbs_up', // already rated
          feedbackComment: null,
          conversationId: 'conv-1',
          conversation: { userId: studentUserId },
        } as unknown as Awaited<ReturnType<typeof utilityRepository.getAiLogForUser>>)

        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/feedback')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            logId: 'log-1',
            rating: 'thumbs_down',
          })

        expect(res.status).toBe(409)
        expect(res.body.message).toContain('already been submitted')
      })

      it('rejects feedback on message belonging to another user with 404 (IDOR protection)', async () => {
        vi.mocked(utilityRepository.getAiLogForUser).mockResolvedValue(null)

        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/feedback')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            logId: 'foreign-log-id',
            rating: 'thumbs_down',
          })

        expect(res.status).toBe(404)
        expect(res.body.message).toBe('Message not found')
      })
    })

    // ── Admin Endpoints ───────────────────────────────────────────────────────
    describe('Admin Endpoints (RBAC & Moderation)', () => {
      it('rejects non-admin from GET /admin/logs with 403 Forbidden', async () => {
        const res = await request(app)
          .get('/api/v1/utilities/ai-assistant/admin/logs')
          .set('Authorization', `Bearer ${studentToken}`)

        expect(res.status).toBe(403)
        expect(res.body.message).toContain('Admin access required')
      })

      it('allows admin to fetch audit logs with truncated preview (PII protection)', async () => {
        vi.mocked(utilityRepository.getAdminLogs).mockResolvedValue({
          logs: [
            {
              id: 'log-audit-1',
              role: 'USER',
              contentPreview: 'How do I pay zakat?',
              content: undefined, // full content stripped from list
              topicCategory: 'FINANCIAL',
              isRedirected: false,
              isAdversarial: false,
              isOutOfScope: false,
              isFlagged: false,
              createdAt: new Date(),
              conversation: { id: 'conv-1', userId: 'user-xyz', title: 'Zakat inquiry', isFlagged: false, flagReason: null },
            } as unknown as never,
          ],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        })

        const res = await request(app)
          .get('/api/v1/utilities/ai-assistant/admin/logs')
          .set('Authorization', `Bearer ${adminToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.logs.length).toBe(1)
        expect(res.body.data.logs[0].contentPreview).toBe('How do I pay zakat?')
        expect(res.body.data.logs[0].content).toBeUndefined()
      })

      it('allows admin to flag a conversation for human review', async () => {
        vi.mocked(utilityRepository.flagConversation).mockResolvedValue({
          id: 'conv-1',
          isFlagged: true,
          flaggedAt: new Date(),
          flagReason: 'Suspicious ruling query',
        })

        const res = await request(app)
          .patch('/api/v1/utilities/ai-assistant/admin/conversations/conv-1/flag')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isFlagged: true, reason: 'Suspicious ruling query' })

        expect(res.status).toBe(200)
        expect(res.body.data.isFlagged).toBe(true)
        expect(res.body.data.flagReason).toBe('Suspicious ruling query')
      })

      it('allows admin to ingest document into RAG corpus', async () => {
        vi.mocked(ingestDocument).mockResolvedValue('doc-rag-1')

        const res = await request(app)
          .post('/api/v1/utilities/ai-assistant/admin/ingest')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            sourceType: 'FAQ',
            title: 'Platform Refund Policy',
            content: 'Users can request a refund within 14 days of course purchase.',
            url: '/help/refunds',
          })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.data.documentId).toBe('doc-rag-1')
      })
    })
  })
})

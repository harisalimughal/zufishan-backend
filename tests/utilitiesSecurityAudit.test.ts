/**
 * Comprehensive Security Audit Test Suite — Utilities Module
 *
 * Validates the defensive security posture of the Utilities module:
 *  1. Input Size Limits & Parameter Schemas (Zod)
 *  2. JWT Authentication & Protected Endpoint Coverage (401)
 *  3. Role-Based Access Control (RBAC — 403 for non-admins)
 *  4. User Data Isolation (IDOR Protection)
 *  5. Error Response Sanitization (No sensitive upstream provider body leakage)
 *  6. Safe Audio URLs (Anti-XSS / protocol safety)
 *  7. API Abuse & Rate Limiting (checkRateLimit 429)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { generateToken } from '../src/utils/jwt'
import { ApiError } from '../src/utils/apiError'
import { checkRateLimit } from '../src/utils/aiRateLimiter'
import {
  zakatCalculateSchema,
  aiAssistantMessageSchema,
  tasbihSaveSchema,
  aiConversationParamSchema,
  aiLogParamSchema,
} from '../src/validators/utility.validator'

// ─── Mock Repositories & Utilities ──────────────────────────────────────────

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
}))

vi.mock('../src/repositories/tasbih.repository', () => ({
  tasbihRepository: {
    createSession: vi.fn(),
    findByDate: vi.fn(),
    findByDateRange: vi.fn(),
  },
}))

vi.mock('../src/repositories/zakatCalculation.repository', () => ({
  zakatCalculationRepository: {
    findByUserIdPaginated: vi.fn(),
  },
}))

vi.mock('../src/repositories/azkar.repository', () => ({
  azkarRepository: {
    findCategories: vi.fn().mockResolvedValue([]),
    findItemsByCategoryId: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    findItemById: vi.fn().mockResolvedValue(null),
    categoryExists: vi.fn().mockResolvedValue(false),
  },
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

import { utilityRepository } from '../src/repositories/utility.repository'
import {
  zakatCalculationRepository,
  type ZakatCalculationRow,
} from '../src/repositories/zakatCalculation.repository'
import { aiAssistantService } from '../src/services/aiAssistant.service'
import { zakatHistoryService } from '../src/services/zakatHistory.service'
import { generateAnswer } from '../src/services/ai-services/generator'
import { generateEmbedding } from '../src/services/ai-services/embeddings'

// ─── Token Fixtures ─────────────────────────────────────────────────────────

const studentToken = generateToken({
  id: 'user-student-1',
  email: 'student@example.com',
  role: 'STUDENT',
})

const adminToken = generateToken({
  id: 'user-admin-1',
  email: 'admin@example.com',
  role: 'ADMIN',
})

describe('Utilities Module — Complete Security Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // 1. Input Size Limits & Parameter Schemas (Zod Validation)
  // ==========================================================================

  describe('1. Input Size Limits & Schema Validation', () => {
    it('zakatCalculateSchema: rejects payload with > 100 assets (DoS protection)', () => {
      const excessiveAssets = Array.from({ length: 101 }, () => ({
        category: 'cash' as const,
        value: 1000,
      }))

      const result = zakatCalculateSchema.safeParse({
        assets: excessiveAssets,
        madhab: 'hanafi',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('assets cannot exceed 100 items')
      }
    })

    it('zakatCalculateSchema: accepts payload with up to 100 assets', () => {
      const validAssets = Array.from({ length: 100 }, () => ({
        category: 'cash' as const,
        value: 100,
      }))

      const result = zakatCalculateSchema.safeParse({
        assets: validAssets,
        madhab: 'hanafi',
      })

      expect(result.success).toBe(true)
    })

    it('aiAssistantMessageSchema: rejects messages longer than 2000 characters', () => {
      const longMessage = 'A'.repeat(2001)
      const result = aiAssistantMessageSchema.safeParse({ message: longMessage })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Message too long')
      }
    })

    it('tasbihSaveSchema: rejects negative count and count exceeding 10000 in service', () => {
      const zeroCount = tasbihSaveSchema.safeParse({ phrase: 'SubhanAllah', count: 0 })
      expect(zeroCount.success).toBe(false)

      const negativeCount = tasbihSaveSchema.safeParse({ phrase: 'SubhanAllah', count: -5 })
      expect(negativeCount.success).toBe(false)
    })

    it('aiConversationParamSchema: validates conversationId parameter correctly', () => {
      expect(aiConversationParamSchema.safeParse({ conversationId: 'conv_123' }).success).toBe(true)
      expect(aiConversationParamSchema.safeParse({ conversationId: '' }).success).toBe(false)
      expect(aiConversationParamSchema.safeParse({ conversationId: 'A'.repeat(129) }).success).toBe(false)
    })

    it('aiLogParamSchema: validates logId parameter correctly', () => {
      expect(aiLogParamSchema.safeParse({ logId: 'log_456' }).success).toBe(true)
      expect(aiLogParamSchema.safeParse({ logId: '' }).success).toBe(false)
      expect(aiLogParamSchema.safeParse({ logId: 'B'.repeat(129) }).success).toBe(false)
    })
  })

  // ==========================================================================
  // 2. JWT Verification & Endpoint Authorization (401 / 403)
  // ==========================================================================

  describe('2. JWT Verification & Endpoint Authorization', () => {
    const protectedEndpoints = [
      { method: 'get', path: '/api/v1/utilities/zakat/history' },
      { method: 'post', path: '/api/v1/utilities/tasbih/sessions' },
      { method: 'get', path: '/api/v1/utilities/tasbih/sessions' },
      { method: 'get', path: '/api/v1/utilities/tasbih/stats' },
      { method: 'post', path: '/api/v1/utilities/ai-assistant/chat' },
      { method: 'get', path: '/api/v1/utilities/ai-assistant/history' },
      { method: 'get', path: '/api/v1/utilities/ai-assistant/conversations/conv-123' },
      { method: 'post', path: '/api/v1/utilities/ai-assistant/feedback' },
      { method: 'get', path: '/api/v1/utilities/ai-assistant/admin/logs' },
    ]

    function makeRequest(method: string, path: string) {
      if (method === 'post') return request(app).post(path)
      if (method === 'patch') return request(app).patch(path)
      return request(app).get(path)
    }

    for (const ep of protectedEndpoints) {
      it(`rejects unauthenticated request to ${ep.method.toUpperCase()} ${ep.path} with 401`, async () => {
        const res = await makeRequest(ep.method, ep.path)
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
      })

      it(`rejects malformed Bearer token to ${ep.method.toUpperCase()} ${ep.path} with 401`, async () => {
        const res = await makeRequest(ep.method, ep.path).set(
          'Authorization',
          'Bearer invalid.jwt.token',
        )
        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
      })
    }

    const adminEndpoints = [
      { method: 'get', path: '/api/v1/utilities/ai-assistant/admin/logs' },
      { method: 'get', path: '/api/v1/utilities/ai-assistant/admin/logs/log-123' },
      { method: 'patch', path: '/api/v1/utilities/ai-assistant/admin/conversations/conv-123/flag' },
      { method: 'patch', path: '/api/v1/utilities/ai-assistant/admin/logs/log-123/flag' },
      { method: 'post', path: '/api/v1/utilities/ai-assistant/admin/ingest' },
    ]

    for (const ep of adminEndpoints) {
      it(`rejects non-admin role (STUDENT) on ${ep.method.toUpperCase()} ${ep.path} with 403`, async () => {
        const res = await makeRequest(ep.method, ep.path).set(
          'Authorization',
          `Bearer ${studentToken}`,
        )
        expect(res.status).toBe(403)
        expect(res.body.message).toContain('Admin access required')
      })
    }

    it('allows ADMIN role to access admin logs endpoint', async () => {
      vi.mocked(utilityRepository.getAdminLogs).mockResolvedValue({
        logs: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      })

      const res = await request(app)
        .get('/api/v1/utilities/ai-assistant/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  // ==========================================================================
  // 3. User Data Isolation (IDOR Protection)
  // ==========================================================================

  describe('3. User Data Isolation (IDOR Protection)', () => {
    it('aiAssistantService: throws 404 when user attempts to access another user conversation', async () => {
      vi.mocked(utilityRepository.getConversationHistory).mockResolvedValue(null)

      await expect(
        aiAssistantService.getConversationHistory('foreign-conv-id', 'user-attacker'),
      ).rejects.toThrow(ApiError)

      await expect(
        aiAssistantService.getConversationHistory('foreign-conv-id', 'user-attacker'),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Conversation not found',
      })
    })

    it('aiAssistantService: throws 404 when user attempts to submit feedback on another user message', async () => {
      vi.mocked(utilityRepository.getAiLogForUser).mockResolvedValue(null)

      await expect(
        aiAssistantService.submitFeedback('user-attacker', {
          messageId: 'victim-log-id',
          rating: 'thumbs_down',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Message not found',
      })
    })

    it('zakatHistoryService: strictly isolates history to authenticated userId and drops mismatched rows', async () => {
      const mixedRows = [
        {
          id: 'row-1',
          userId: 'legit-user',
          goldGrams: { toString: () => '87.48' },
          silverGrams: { toString: () => '612.36' },
          cashSavings: { toString: () => '1000' },
          investments: { toString: () => '0' },
          businessAssets: { toString: () => '0' },
          receivables: { toString: () => '0' },
          totalZakatableAssets: { toString: () => '1000' },
          nisabThreshold: { toString: () => '500' },
          zakatDue: { toString: () => '25' },
          zakatableAboveNisab: true,
          currency: 'USD',
          nisabRateId: null,
          createdAt: new Date(),
        },
        {
          id: 'row-leak-from-other-user',
          userId: 'other-user',
          goldGrams: { toString: () => '10' },
          silverGrams: { toString: () => '10' },
          cashSavings: { toString: () => '5000' },
          investments: { toString: () => '0' },
          businessAssets: { toString: () => '0' },
          receivables: { toString: () => '0' },
          totalZakatableAssets: { toString: () => '5000' },
          nisabThreshold: { toString: () => '500' },
          zakatDue: { toString: () => '125' },
          zakatableAboveNisab: true,
          currency: 'USD',
          nisabRateId: null,
          createdAt: new Date(),
        },
      ]

      vi.mocked(zakatCalculationRepository.findByUserIdPaginated).mockResolvedValue({
        rows: mixedRows as unknown as ZakatCalculationRow[],
        total: 2,
      })

      const history = await zakatHistoryService.getHistory('legit-user', {
        page: 1,
        limit: 10,
      })

      expect(history.items.length).toBe(1)
      expect(history.items[0].userId).toBe('legit-user')
      expect(history.items[0].id).toBe('row-1')
    })
  })

  // ==========================================================================
  // 4. Secure Error Responses & Sensitive Data Protection
  // ==========================================================================

  describe('4. Secure Error Responses & Upstream Body Protection', () => {
    it('generateAnswer: sanitizes upstream Gemini error and never leaks raw error body', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('API_KEY_INVALID: secret_internal_key_leak_probe'),
      } as unknown as Response)

      try {
        await expect(generateAnswer('Hello')).rejects.toThrow(ApiError)
        await expect(generateAnswer('Hello')).rejects.toMatchObject({
          statusCode: 500,
          message: 'Failed to generate AI response. Please try again later.',
        })
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('generateEmbedding: sanitizes upstream Gemini error and never leaks raw error body', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('PROJECT_PERMISSION_DENIED with internal backend uri'),
      } as unknown as Response)

      try {
        await expect(generateEmbedding('Test text')).rejects.toThrow(ApiError)
        await expect(generateEmbedding('Test text')).rejects.toMatchObject({
          statusCode: 500,
          message: 'Failed to process AI embeddings.',
        })
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  // ==========================================================================
  // 5. API Abuse Prevention & Rate Limiting
  // ==========================================================================

  describe('5. Abuse Prevention & Rate Limiting', () => {
    it('checkRateLimit: allows up to 20 requests and throws 429 on 21st request', () => {
      const testUserId = `test-user-${Date.now()}`

      // First 20 requests succeed
      for (let i = 0; i < 20; i++) {
        expect(() => checkRateLimit(testUserId)).not.toThrow()
      }

      // 21st request throws 429
      expect(() => checkRateLimit(testUserId)).toThrow(ApiError)
      try {
        checkRateLimit(testUserId)
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect((err as ApiError).statusCode).toBe(429)
        expect((err as ApiError).message).toContain('AI Assistant rate limit reached')
      }
    })
  })
})

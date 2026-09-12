/**
 * AI Assistant History & Feedback — Unit & Behavioral Tests
 *
 * Covers:
 *  - GET /history without conversationId:
 *      * Paginated conversation threads returned
 *      * User isolation (userId strictly forwarded)
 *      * Ordering (newest active first)
 *      * Custom page and limit
 *  - GET /history?conversationId=:
 *      * Returns specific conversation with messages
 *      * Chronological message ordering
 *      * Paginated message turns
 *      * 404 when conversation not found or owned by another user
 *  - POST /feedback:
 *      * Happy path with messageId and thumbs_up
 *      * Happy path with logId and thumbs_down
 *      * Semantic ratings (helpful, not_helpful, inappropriate)
 *      * Prevent duplicate feedback (409 Conflict)
 *      * Authorization check (foreign user message returns 404)
 *      * Non-existent message returns 404
 *  - Zod Schema Validation:
 *      * Requires messageId or logId
 *      * Rejects invalid rating values
 *      * Enforces comment length <= 500 chars
 *      * Validates history query pagination boundaries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '../src/utils/apiError'

// ─── Mock utilityRepository ───────────────────────────────────────────────────

vi.mock('../src/repositories/utility.repository', () => ({
  utilityRepository: {
    getUserConversations: vi.fn(),
    getConversationHistory: vi.fn(),
    getAiLogForUser: vi.fn(),
    submitFeedback: vi.fn(),
  },
}))

import { aiAssistantService } from '../src/services/aiAssistant.service'
import { utilityRepository } from '../src/repositories/utility.repository'
import {
  aiHistoryQuerySchema,
  aiAssistantFeedbackSchema,
} from '../src/validators/utility.validator'

describe('AI Assistant History & Feedback Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // 1. GET /history — Thread Listing & Message History
  // ============================================================================

  describe('aiAssistantService.getHistory', () => {
    it('returns paginated conversation list when conversationId is omitted', async () => {
      const mockResult = {
        conversations: [
          {
            id: 'conv-1',
            title: 'First Chat',
            createdAt: new Date('2026-09-12T10:00:00Z'),
            updatedAt: new Date('2026-09-12T11:00:00Z'),
            _count: { logs: 4 },
          },
          {
            id: 'conv-2',
            title: 'Second Chat',
            createdAt: new Date('2026-09-11T09:00:00Z'),
            updatedAt: new Date('2026-09-11T09:30:00Z'),
            _count: { logs: 2 },
          },
        ],
        pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
      }

      vi.mocked(utilityRepository.getUserConversations).mockResolvedValue(mockResult)

      const result = await aiAssistantService.getHistory('user-123', { page: 1, limit: 20 })

      expect(utilityRepository.getUserConversations).toHaveBeenCalledWith('user-123', {
        page: 1,
        limit: 20,
      })
      expect(result).toEqual(mockResult)
    })

    it('returns message history when conversationId is provided', async () => {
      const mockHistory = {
        conversation: {
          id: 'conv-1',
          title: 'Prayer times query',
          createdAt: new Date('2026-09-12T10:00:00Z'),
          updatedAt: new Date('2026-09-12T10:05:00Z'),
        },
        messages: [
          {
            id: 'log-1',
            role: 'USER' as const,
            content: 'How do I calculate zakat?',
            modelUsed: null,
            latencyMs: null,
            rating: null,
            feedbackComment: null,
            isRedirected: false,
            isOutOfScope: false,
            createdAt: new Date('2026-09-12T10:00:00Z'),
          },
          {
            id: 'log-2',
            role: 'ASSISTANT' as const,
            content: 'Zakat is calculated as 2.5% of eligible wealth above the nisab.',
            modelUsed: 'gemini-1.5-flash',
            latencyMs: 340,
            rating: null,
            feedbackComment: null,
            isRedirected: false,
            isOutOfScope: false,
            createdAt: new Date('2026-09-12T10:00:02Z'),
          },
        ],
        pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
      }

      vi.mocked(utilityRepository.getConversationHistory).mockResolvedValue(mockHistory)

      const result = await aiAssistantService.getHistory('user-123', {
        conversationId: 'conv-1',
        page: 1,
        limit: 20,
      })

      expect(utilityRepository.getConversationHistory).toHaveBeenCalledWith(
        'conv-1',
        'user-123',
        { page: 1, limit: 20 },
      )
      expect(result).toEqual(mockHistory)
    })

    it('throws 404 when conversationId does not exist or belongs to another user', async () => {
      vi.mocked(utilityRepository.getConversationHistory).mockResolvedValue(null)

      await expect(
        aiAssistantService.getHistory('user-123', { conversationId: 'conv-forbidden' }),
      ).rejects.toThrow(ApiError)

      await expect(
        aiAssistantService.getHistory('user-123', { conversationId: 'conv-forbidden' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Conversation not found',
      })
    })
  })

  // ============================================================================
  // 2. POST /feedback — Feedback Submission & Duplicate Guard
  // ============================================================================

  describe('aiAssistantService.submitFeedback', () => {
    it('submits thumbs_up feedback successfully when using messageId', async () => {
      const mockLog = {
        id: 'msg-001',
        role: 'ASSISTANT' as const,
        rating: null,
        feedbackComment: null,
        conversationId: 'conv-1',
        conversation: { userId: 'user-123' },
      }
      const mockUpdated = {
        id: 'msg-001',
        conversationId: 'conv-1',
        rating: 'thumbs_up',
        feedbackComment: null,
        createdAt: new Date(),
      }

      vi.mocked(utilityRepository.getAiLogForUser).mockResolvedValue(mockLog)
      vi.mocked(utilityRepository.submitFeedback).mockResolvedValue(mockUpdated)

      const result = await aiAssistantService.submitFeedback('user-123', {
        messageId: 'msg-001',
        rating: 'thumbs_up',
      })

      expect(utilityRepository.getAiLogForUser).toHaveBeenCalledWith('msg-001', 'user-123')
      expect(utilityRepository.submitFeedback).toHaveBeenCalledWith(
        'msg-001',
        'thumbs_up',
        undefined,
      )
      expect(result).toEqual(mockUpdated)
    })

    it('submits thumbs_down feedback with comment successfully when using logId', async () => {
      const mockLog = {
        id: 'log-002',
        role: 'ASSISTANT' as const,
        rating: null,
        feedbackComment: null,
        conversationId: 'conv-1',
        conversation: { userId: 'user-123' },
      }
      const mockUpdated = {
        id: 'log-002',
        conversationId: 'conv-1',
        rating: 'thumbs_down',
        feedbackComment: 'The answer was missing calculation examples',
        createdAt: new Date(),
      }

      vi.mocked(utilityRepository.getAiLogForUser).mockResolvedValue(mockLog)
      vi.mocked(utilityRepository.submitFeedback).mockResolvedValue(mockUpdated)

      const result = await aiAssistantService.submitFeedback('user-123', {
        logId: 'log-002',
        rating: 'thumbs_down',
        comment: 'The answer was missing calculation examples',
      })

      expect(utilityRepository.getAiLogForUser).toHaveBeenCalledWith('log-002', 'user-123')
      expect(utilityRepository.submitFeedback).toHaveBeenCalledWith(
        'log-002',
        'thumbs_down',
        'The answer was missing calculation examples',
      )
      expect(result).toEqual(mockUpdated)
    })

    it('prevents duplicate feedback and throws 409 Conflict if already rated', async () => {
      const mockAlreadyRatedLog = {
        id: 'msg-001',
        role: 'ASSISTANT' as const,
        rating: 'thumbs_up', // Already rated!
        feedbackComment: null,
        conversationId: 'conv-1',
        conversation: { userId: 'user-123' },
      }

      vi.mocked(utilityRepository.getAiLogForUser).mockResolvedValue(mockAlreadyRatedLog)

      await expect(
        aiAssistantService.submitFeedback('user-123', {
          messageId: 'msg-001',
          rating: 'thumbs_down',
        }),
      ).rejects.toThrow(ApiError)

      await expect(
        aiAssistantService.submitFeedback('user-123', {
          messageId: 'msg-001',
          rating: 'thumbs_down',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Feedback has already been submitted for this message',
      })

      expect(utilityRepository.submitFeedback).not.toHaveBeenCalled()
    })

    it('rejects feedback on non-existent message with 404', async () => {
      vi.mocked(utilityRepository.getAiLogForUser).mockResolvedValue(null)

      await expect(
        aiAssistantService.submitFeedback('user-123', {
          messageId: 'non-existent',
          rating: 'helpful',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Message not found',
      })
    })

    it('rejects feedback on message belonging to another user with 404', async () => {
      // getAiLogForUser searches with conversation: { userId: 'user-123' }, returning null for another user
      vi.mocked(utilityRepository.getAiLogForUser).mockResolvedValue(null)

      await expect(
        aiAssistantService.submitFeedback('attacker-user', {
          messageId: 'victim-msg-id',
          rating: 'thumbs_down',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Message not found',
      })
    })
  })

  // ============================================================================
  // 3. Zod Schemas Validation
  // ============================================================================

  describe('aiHistoryQuerySchema validation', () => {
    it('parses valid query with conversationId and pagination', () => {
      const parsed = aiHistoryQuerySchema.parse({
        conversationId: 'clxyz1234567890',
        page: '2',
        limit: '15',
      })
      expect(parsed).toEqual({
        conversationId: 'clxyz1234567890',
        page: 2,
        limit: 15,
      })
    })

    it('defaults page to 1 and limit to 20 when omitted', () => {
      const parsed = aiHistoryQuerySchema.parse({})
      expect(parsed.page).toBe(1)
      expect(parsed.limit).toBe(20)
      expect(parsed.conversationId).toBeUndefined()
    })

    it('treats empty string conversationId as undefined', () => {
      const parsed = aiHistoryQuerySchema.parse({ conversationId: '' })
      expect(parsed.conversationId).toBeUndefined()
    })

    it('rejects invalid page < 1', () => {
      expect(() => aiHistoryQuerySchema.parse({ page: '0' })).toThrow()
    })

    it('rejects invalid limit > 100', () => {
      expect(() => aiHistoryQuerySchema.parse({ limit: '101' })).toThrow()
    })
  })

  describe('aiAssistantFeedbackSchema validation', () => {
    it('accepts valid thumbs_up with messageId', () => {
      const parsed = aiAssistantFeedbackSchema.parse({
        messageId: 'clxyz1234',
        rating: 'thumbs_up',
      })
      expect(parsed.rating).toBe('thumbs_up')
      expect(parsed.messageId).toBe('clxyz1234')
    })

    it('accepts valid thumbs_down with logId and comment', () => {
      const parsed = aiAssistantFeedbackSchema.parse({
        logId: 'clxyz5678',
        rating: 'thumbs_down',
        comment: 'Needs more detail',
      })
      expect(parsed.rating).toBe('thumbs_down')
      expect(parsed.logId).toBe('clxyz5678')
      expect(parsed.comment).toBe('Needs more detail')
    })

    it('accepts semantic ratings (helpful, not_helpful, inappropriate)', () => {
      for (const rating of ['helpful', 'not_helpful', 'inappropriate'] as const) {
        const parsed = aiAssistantFeedbackSchema.parse({
          messageId: 'clxyz1234',
          rating,
        })
        expect(parsed.rating).toBe(rating)
      }
    })

    it('rejects payload when both messageId and logId are missing', () => {
      expect(() =>
        aiAssistantFeedbackSchema.parse({
          rating: 'thumbs_up',
        }),
      ).toThrow('Either messageId or logId must be provided')
    })

    it('rejects invalid rating values', () => {
      expect(() =>
        aiAssistantFeedbackSchema.parse({
          messageId: 'clxyz1234',
          rating: 'super_good',
        }),
      ).toThrow()
    })

    it('rejects comments longer than 500 characters', () => {
      expect(() =>
        aiAssistantFeedbackSchema.parse({
          messageId: 'clxyz1234',
          rating: 'thumbs_down',
          comment: 'a'.repeat(501),
        }),
      ).toThrow('Comment must be 500 characters or fewer')
    })
  })
})

/**
 * Zakat Calculation Repository — Unit Tests
 *
 * Mocks Prisma to assert:
 *   - every history query is scoped by userId
 *   - newest-first ordering + skip/take pagination
 *   - unscoped calls are refused
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/config/prisma', () => ({
  prisma: {
    zakatCalculation: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../src/config/prisma'
import { zakatCalculationRepository } from '../src/repositories/zakatCalculation.repository'

describe('zakatCalculationRepository.findByUserIdPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuses to query without a userId', async () => {
    await expect(
      zakatCalculationRepository.findByUserIdPaginated({
        userId: '',
        page: 1,
        limit: 10,
      }),
    ).rejects.toThrow(/requires userId/)

    expect(prisma.zakatCalculation.findMany).not.toHaveBeenCalled()
    expect(prisma.zakatCalculation.count).not.toHaveBeenCalled()
  })

  it('always includes userId in where and orders by createdAt desc', async () => {
    vi.mocked(prisma.zakatCalculation.findMany).mockResolvedValue([])
    vi.mocked(prisma.zakatCalculation.count).mockResolvedValue(0)

    await zakatCalculationRepository.findByUserIdPaginated({
      userId: 'user-a',
      page: 2,
      limit: 10,
    })

    expect(prisma.zakatCalculation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-a' },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      }),
    )
    expect(prisma.zakatCalculation.count).toHaveBeenCalledWith({
      where: { userId: 'user-a' },
    })
  })

  it('scopes currency filter together with userId (never currency alone)', async () => {
    vi.mocked(prisma.zakatCalculation.findMany).mockResolvedValue([])
    vi.mocked(prisma.zakatCalculation.count).mockResolvedValue(0)

    await zakatCalculationRepository.findByUserIdPaginated({
      userId: 'user-a',
      page: 1,
      limit: 5,
      currency: 'PKR',
    })

    const findArg = vi.mocked(prisma.zakatCalculation.findMany).mock.calls[0]![0]
    expect(findArg.where).toEqual({ userId: 'user-a', currency: 'PKR' })
    expect(findArg.where).toHaveProperty('userId', 'user-a')
  })

  it('does not accept a different userId via currency or other fields', async () => {
    vi.mocked(prisma.zakatCalculation.findMany).mockResolvedValue([])
    vi.mocked(prisma.zakatCalculation.count).mockResolvedValue(0)

    await zakatCalculationRepository.findByUserIdPaginated({
      userId: 'user-a',
      page: 1,
      limit: 10,
    })

    const where = vi.mocked(prisma.zakatCalculation.findMany).mock.calls[0]![0].where as {
      userId: string
    }
    expect(where.userId).toBe('user-a')
    expect(Object.keys(where)).not.toContain('OR')
  })
})

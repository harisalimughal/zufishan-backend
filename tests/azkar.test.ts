/**
 * Azkar Service — Unit Tests
 *
 * Covers:
 *  - getCategories: DTO shape, count
 *  - getItemsByCategory: pagination envelope math, 404 on unknown category,
 *    search passthrough to repository
 *  - getItemById: 404 on missing item, full DTO shape with category
 *  - Audio URL safety rule: https:// kept, http:// stripped, null kept, garbage stripped
 *
 * No network, no DB — azkarRepository is fully mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '../src/utils/apiError'

// ─── Mock the repository before importing the service ────────────────────────

vi.mock('../src/repositories/azkar.repository', () => ({
  azkarRepository: {
    findCategories: vi.fn(),
    findItemsByCategoryId: vi.fn(),
    findItemById: vi.fn(),
    categoryExists: vi.fn(),
  },
}))

// ─── Mock the logger to suppress output during tests ─────────────────────────

vi.mock('../src/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { azkarService } from '../src/services/azkar.service'
import { azkarRepository } from '../src/repositories/azkar.repository'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const mockCategory = {
  id: 'cat-morning',
  slug: 'morning',
  name: 'Morning Azkar',
  arabicName: 'أذكار الصباح',
  description: 'Morning supplications',
  iconName: 'Sunrise',
  displayOrder: 1,
  isActive: true,
}

const mockItem = (overrides: Partial<typeof baseItem> = {}) => ({
  ...baseItem,
  ...overrides,
})

const baseItem = {
  id: 'item-001',
  categoryId: 'cat-morning',
  arabic: 'بِسْمِ اللَّهِ',
  transliteration: 'Bismillah',
  translation: 'In the name of Allah',
  repetitions: 1,
  reference: 'Sahih Bukhari 7396',
  audioUrl: null as string | null,
  displayOrder: 1,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

// ─── getCategories ────────────────────────────────────────────────────────────

describe('azkarService.getCategories', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns categories array with correct shape', async () => {
    vi.mocked(azkarRepository.findCategories).mockResolvedValueOnce([mockCategory])

    const result = await azkarService.getCategories()
    const categories = (result as { categories: unknown[] }).categories

    expect(Array.isArray(categories)).toBe(true)
    expect(categories).toHaveLength(1)

    const cat = categories[0] as Record<string, unknown>
    expect(cat.id).toBe('cat-morning')
    expect(cat.slug).toBe('morning')
    expect(cat.name).toBe('Morning Azkar')
    expect(cat.arabicName).toBe('أذكار الصباح')
    expect(cat.description).toBe('Morning supplications')
    expect(cat.iconName).toBe('Sunrise')
    expect(cat.displayOrder).toBe(1)
    // isActive must NOT be exposed in the DTO
    expect(cat.isActive).toBeUndefined()
  })

  it('returns empty categories array when no active categories exist', async () => {
    vi.mocked(azkarRepository.findCategories).mockResolvedValueOnce([])

    const result = await azkarService.getCategories()
    expect((result as { categories: unknown[] }).categories).toHaveLength(0)
  })
})

// ─── getItemsByCategory ───────────────────────────────────────────────────────

describe('azkarService.getItemsByCategory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when the category does not exist', async () => {
    vi.mocked(azkarRepository.categoryExists).mockResolvedValueOnce(false)

    await expect(
      azkarService.getItemsByCategory('nonexistent-id', { page: 1, limit: 20, search: undefined }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns correct pagination envelope for first page', async () => {
    vi.mocked(azkarRepository.categoryExists).mockResolvedValueOnce(true)
    vi.mocked(azkarRepository.findItemsByCategoryId).mockResolvedValueOnce({
      rows: [mockItem(), mockItem({ id: 'item-002', displayOrder: 2 })],
      total: 25,
    })

    const result = await azkarService.getItemsByCategory('cat-morning', { page: 1, limit: 10, search: undefined })
    const { pagination, items } = result as {
      pagination: Record<string, unknown>
      items: unknown[]
    }

    expect(pagination.page).toBe(1)
    expect(pagination.limit).toBe(10)
    expect(pagination.total).toBe(25)
    expect(pagination.totalPages).toBe(3) // Math.ceil(25 / 10)
    expect(pagination.hasNextPage).toBe(true)
    expect(pagination.hasPrevPage).toBe(false)
    expect(items).toHaveLength(2)
  })

  it('computes hasPrevPage true on page > 1', async () => {
    vi.mocked(azkarRepository.categoryExists).mockResolvedValueOnce(true)
    vi.mocked(azkarRepository.findItemsByCategoryId).mockResolvedValueOnce({ rows: [], total: 25 })

    const result = await azkarService.getItemsByCategory('cat-morning', { page: 2, limit: 10, search: undefined })
    const { pagination } = result as { pagination: Record<string, unknown> }
    expect(pagination.hasPrevPage).toBe(true)
  })

  it('passes search string through to the repository', async () => {
    vi.mocked(azkarRepository.categoryExists).mockResolvedValueOnce(true)
    vi.mocked(azkarRepository.findItemsByCategoryId).mockResolvedValueOnce({ rows: [], total: 0 })

    await azkarService.getItemsByCategory('cat-morning', { page: 1, limit: 20, search: 'morning' })

    expect(azkarRepository.findItemsByCategoryId).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'morning' }),
    )
  })

  it('passes undefined search when not supplied', async () => {
    vi.mocked(azkarRepository.categoryExists).mockResolvedValueOnce(true)
    vi.mocked(azkarRepository.findItemsByCategoryId).mockResolvedValueOnce({ rows: [], total: 0 })

    await azkarService.getItemsByCategory('cat-morning', { page: 1, limit: 20, search: undefined })

    expect(azkarRepository.findItemsByCategoryId).toHaveBeenCalledWith(
      expect.objectContaining({ search: undefined }),
    )
  })

  it('item DTOs do not expose isActive', async () => {
    vi.mocked(azkarRepository.categoryExists).mockResolvedValueOnce(true)
    vi.mocked(azkarRepository.findItemsByCategoryId).mockResolvedValueOnce({
      rows: [mockItem()],
      total: 1,
    })

    const result = await azkarService.getItemsByCategory('cat-morning', { page: 1, limit: 20, search: undefined })
    const items = (result as { items: Record<string, unknown>[] }).items
    expect(items[0].isActive).toBeUndefined()
  })
})

// ─── getItemById ──────────────────────────────────────────────────────────────

describe('azkarService.getItemById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when item does not exist', async () => {
    vi.mocked(azkarRepository.findItemById).mockResolvedValueOnce(null)

    await expect(azkarService.getItemById('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(azkarService.getItemById('nonexistent')).rejects.toBeInstanceOf(ApiError)
  })

  it('returns item DTO with embedded category on success', async () => {
    vi.mocked(azkarRepository.findItemById).mockResolvedValueOnce({
      ...mockItem({ audioUrl: 'https://cdn.example.com/audio/bismillah.mp3' }),
      category: mockCategory,
    })

    const result = await azkarService.getItemById('item-001')
    const item = (result as { item: Record<string, unknown> }).item

    expect(item.id).toBe('item-001')
    expect(item.arabic).toBe('بِسْمِ اللَّهِ')
    expect(item.transliteration).toBe('Bismillah')
    expect(item.translation).toBe('In the name of Allah')
    expect(item.repetitions).toBe(1)
    expect(item.reference).toBe('Sahih Bukhari 7396')
    expect(item.audioUrl).toBe('https://cdn.example.com/audio/bismillah.mp3')
    expect(item.isActive).toBeUndefined()

    const category = item.category as Record<string, unknown>
    expect(category.id).toBe('cat-morning')
    expect(category.slug).toBe('morning')
    expect(category.arabicName).toBe('أذكار الصباح')
    expect(category.isActive).toBeUndefined()
  })
})

// ─── Audio URL safety rule ────────────────────────────────────────────────────

describe('audio URL safety', () => {
  beforeEach(() => vi.clearAllMocks())

  const cases: Array<{ label: string; rawUrl: string | null; expected: string | null }> = [
    { label: 'null → null', rawUrl: null, expected: null },
    { label: 'https:// → passed through', rawUrl: 'https://cdn.example.com/audio.mp3', expected: 'https://cdn.example.com/audio.mp3' },
    { label: 'http:// → stripped to null', rawUrl: 'http://cdn.example.com/audio.mp3', expected: null },
    { label: 'relative path → stripped to null', rawUrl: '/audio/morning.mp3', expected: null },
    { label: 'garbage string → stripped to null', rawUrl: 'ftp://cdn.example.com/audio.mp3', expected: null },
    { label: 'empty string → stripped to null', rawUrl: '', expected: null },
  ]

  for (const { label, rawUrl, expected } of cases) {
    it(label, async () => {
      vi.mocked(azkarRepository.findItemById).mockResolvedValueOnce({
        ...mockItem({ audioUrl: rawUrl }),
        category: mockCategory,
      })

      const result = await azkarService.getItemById('item-001')
      const item = (result as { item: Record<string, unknown> }).item
      expect(item.audioUrl).toBe(expected)
    })
  }
})

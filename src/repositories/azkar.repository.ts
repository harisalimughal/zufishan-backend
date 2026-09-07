/**
 * Azkar Repository
 *
 * Data-access layer for `azkar_categories` and `azkar_items`.
 *
 * Design rules:
 *  - All queries use explicit `select` — never fetch unconstrained columns.
 *  - Pagination is computed here (skip / take) so the service stays free of
 *    raw Prisma paging arithmetic.
 *  - Search is applied as a case-insensitive OR across arabic, transliteration,
 *    and translation using Prisma's `contains` + `mode: 'insensitive'`.  The DB
 *    trigram index (migration 20260907180000) makes this fast at scale.
 *  - `findItemById` joins the parent category so callers receive the full
 *    context in one round-trip.
 */

import { prisma } from '../config/prisma'

// ─── Shared column selects ────────────────────────────────────────────────────

const CATEGORY_SELECT = {
  id: true,
  slug: true,
  name: true,
  arabicName: true,
  description: true,
  iconName: true,
  displayOrder: true,
  isActive: true,
} as const

const ITEM_SELECT = {
  id: true,
  categoryId: true,
  arabic: true,
  transliteration: true,
  translation: true,
  repetitions: true,
  reference: true,
  audioUrl: true,
  displayOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AzkarCategoryRow {
  id: string
  slug: string
  name: string
  arabicName: string
  description: string | null
  iconName: string | null
  displayOrder: number
  isActive: boolean
}

export interface AzkarItemRow {
  id: string
  categoryId: string
  arabic: string
  transliteration: string | null
  translation: string
  repetitions: number
  reference: string | null
  audioUrl: string | null
  displayOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AzkarItemWithCategory extends AzkarItemRow {
  category: AzkarCategoryRow
}

export interface FindItemsParams {
  categoryId: string
  page: number
  limit: number
  /** Optional substring filter (case-insensitive). */
  search?: string
}

export interface PaginatedItems {
  rows: AzkarItemRow[]
  total: number
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const azkarRepository = {
  /**
   * Returns all active categories ordered by displayOrder ascending.
   * No pagination — the category list is small (< 20 rows).
   */
  findCategories: async (): Promise<AzkarCategoryRow[]> => {
    return prisma.azkarCategoryRecord.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: CATEGORY_SELECT,
    })
  },

  /**
   * Paginated active items for a given category.
   *
   * When `search` is provided, filters items whose arabic, transliteration,
   * or translation contains the search string (case-insensitive).
   *
   * The composite index `(categoryId, displayOrder)` satisfies the ORDER BY
   * without a sort step. The GIN trigram index speeds up ILIKE search.
   */
  findItemsByCategoryId: async (params: FindItemsParams): Promise<PaginatedItems> => {
    const { categoryId, page, limit, search } = params
    const skip = (page - 1) * limit

    const searchFilter = search?.trim()
      ? {
          OR: [
            { arabic: { contains: search.trim(), mode: 'insensitive' as const } },
            { transliteration: { contains: search.trim(), mode: 'insensitive' as const } },
            { translation: { contains: search.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {}

    const where = {
      categoryId,
      isActive: true,
      ...searchFilter,
    }

    const [rows, total] = await Promise.all([
      prisma.azkarItem.findMany({
        where,
        orderBy: { displayOrder: 'asc' },
        skip,
        take: limit,
        select: ITEM_SELECT,
      }),
      prisma.azkarItem.count({ where }),
    ])

    return { rows: rows as AzkarItemRow[], total }
  },

  /**
   * Single item by primary key, including its parent category.
   * Returns `null` if the item does not exist or is inactive.
   */
  findItemById: async (id: string): Promise<AzkarItemWithCategory | null> => {
    const item = await prisma.azkarItem.findFirst({
      where: { id, isActive: true },
      select: {
        ...ITEM_SELECT,
        category: {
          select: CATEGORY_SELECT,
        },
      },
    })

    return item as AzkarItemWithCategory | null
  },

  /**
   * Check whether a category exists and is active.
   * Used by the service before performing a potentially-expensive items query.
   */
  categoryExists: async (categoryId: string): Promise<boolean> => {
    const count = await prisma.azkarCategoryRecord.count({
      where: { id: categoryId, isActive: true },
    })
    return count > 0
  },
}

export default azkarRepository

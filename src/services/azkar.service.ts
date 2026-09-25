/**
 * Azkar Service
 *
 * Business-logic layer for the Dua / Azkar content system.
 *
 * Responsibilities:
 *  - Delegate data fetching to `azkarRepository` (no raw Prisma here).
 *  - Map DB rows to clean API DTOs (strip internal `isActive` flag, etc.).
 *  - Apply the audio URL safety rule: only `https://` URLs are forwarded to
 *    clients — any other value (plain `http://`, relative path, garbage) is
 *    silently replaced with `null`.
 *  - Build the pagination envelope expected by the API contract.
 *  - Throw `ApiError.notFound` for missing resources so the global error
 *    handler returns the correct HTTP 404.
 */

import { ApiError } from '../utils/apiError'
import { logger } from '../utils/logger'
import { azkarRepository, type AzkarItemRow, type AzkarCategoryRow, type AzkarItemWithCategory } from '../repositories/azkar.repository'
import type { AzkarItemsQuery } from '../validators/utility.validator'

// ─── Audio URL safety ─────────────────────────────────────────────────────────

/**
 * Returns the URL only when it starts with `https://`.
 * Any non-HTTPS value is returned as null to protect clients from
 * accidentally following insecure or malformed URLs stored in content rows.
 */
function safeAudioUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null
  if (rawUrl.startsWith('https://')) return rawUrl
  logger.warn({ rawUrl }, 'azkar: audioUrl rejected — not an https:// URL')
  return null
}

// ─── DTO mappers ──────────────────────────────────────────────────────────────

function mapCategory(row: AzkarCategoryRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    arabicName: row.arabicName,
    description: row.description ?? null,
    iconName: row.iconName ?? null,
    displayOrder: row.displayOrder,
  }
}

function mapItem(row: AzkarItemRow) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    arabic: row.arabic,
    transliteration: row.transliteration ?? null,
    translation: row.translation,
    repetitions: row.repetitions,
    reference: row.reference ?? null,
    audioUrl: safeAudioUrl(row.audioUrl),
    displayOrder: row.displayOrder,
  }
}

function mapItemWithCategory(row: AzkarItemWithCategory) {
  return {
    ...mapItem(row),
    category: mapCategory(row.category),
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const azkarService = {
  /**
   * GET /api/v1/utilities/azkar/categories
   *
   * Returns all active Azkar categories ordered by displayOrder.
   */
  getCategories: async (): Promise<Record<string, unknown>> => {
    const rows = await azkarRepository.findCategories()
    return { categories: rows.map(mapCategory) }
  },

  /**
   * GET /api/v1/utilities/azkar/:categoryId/items
   *
   * Returns a paginated list of active Azkar items for the given category.
   * Supports an optional `search` filter across Arabic text, transliteration,
   * and translation (case-insensitive substring match).
   */
  getItemsByCategory: async (
    categoryId: string,
    query: AzkarItemsQuery,
  ): Promise<Record<string, unknown>> => {
    const { page, limit, search } = query

    // Validate category exists before running the items query
    const exists = await azkarRepository.categoryExists(categoryId)
    if (!exists) {
      throw ApiError.notFound(`Azkar category not found: ${categoryId}`)
    }

    const { rows, total } = await azkarRepository.findItemsByCategoryId({
      categoryId,
      page,
      limit,
      search,
    })

    const totalPages = Math.ceil(total / limit)

    return {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      items: rows.map(mapItem),
    }
  },

  /**
   * GET /api/v1/utilities/azkar/item/:id
   *
   * Returns a single Azkar item by ID, including its parent category.
   */
  getItemById: async (id: string): Promise<Record<string, unknown>> => {
    const row = await azkarRepository.findItemById(id)

    if (!row) {
      throw ApiError.notFound(`Azkar item not found: ${id}`)
    }

    return { item: mapItemWithCategory(row) }
  },
}

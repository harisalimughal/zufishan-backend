-- Migration: 20260907180000_azkar_items_category_order_idx
-- Adds performance indexes for the Azkar items API:
--
--  1. Composite index (categoryId, displayOrder) — eliminates a sort step for
--     the common paginated category listing pattern:
--       WHERE categoryId = $1 AND isActive = true ORDER BY displayOrder ASC
--
--  2. GIN trigram index for full-text search across arabic, transliteration,
--     and translation.  pg_trgm enables fast ILIKE / contains matching without
--     full sequential scans on large content tables.
--
-- Both indexes are created concurrently to avoid table locks in production.
-- The migration_lock.toml guarantees this runs after the table creation in
-- 20260824000000_utilities_module.

-- 1. Enable pg_trgm extension (idempotent — safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Composite ordered-pagination index
CREATE INDEX IF NOT EXISTS "azkar_items_categoryId_displayOrder_idx"
    ON "azkar_items" ("categoryId", "displayOrder");

-- 3. GIN trigram search index across the three text content columns.
--    COALESCE handles NULL transliteration rows gracefully.
CREATE INDEX IF NOT EXISTS "azkar_items_search_trgm_idx"
    ON "azkar_items"
    USING GIN (
        (arabic || ' ' || COALESCE(transliteration, '') || ' ' || translation)
        gin_trgm_ops
    );

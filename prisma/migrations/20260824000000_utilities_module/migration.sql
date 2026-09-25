-- Migration: 20260824_utilities_module
-- Adds all tables required by the Daily Utilities & AI Assistant module.
-- Existing tables are NOT modified.

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE "AzkarCategory" AS ENUM ('MORNING', 'EVENING', 'SLEEP', 'PRAYER', 'GENERAL');
CREATE TYPE "AiAssistantRole" AS ENUM ('USER', 'ASSISTANT');

-- =====================================================
-- 7a. prayer_time_cache
-- Caches prayer time API responses by location + date + method.
-- =====================================================

CREATE TABLE "prayer_time_cache" (
    "id"         TEXT NOT NULL,
    "latitude"   DECIMAL(9,6) NOT NULL,
    "longitude"  DECIMAL(9,6) NOT NULL,
    "date"       DATE NOT NULL,
    "method"     TEXT NOT NULL DEFAULT 'MWL',
    "fajr"       TEXT NOT NULL,
    "sunrise"    TEXT NOT NULL,
    "dhuhr"      TEXT NOT NULL,
    "asr"        TEXT NOT NULL,
    "maghrib"    TEXT NOT NULL,
    "isha"       TEXT NOT NULL,
    "midnight"   TEXT,
    "lastThird"  TEXT,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_time_cache_pkey" PRIMARY KEY ("id")
);

-- Composite unique: one cache row per location + date + method
CREATE UNIQUE INDEX "prayer_time_cache_latitude_longitude_date_method_key"
    ON "prayer_time_cache" ("latitude", "longitude", "date", "method");

-- Index for scheduled cache-expiry cleanup jobs
CREATE INDEX "prayer_time_cache_expiresAt_idx"
    ON "prayer_time_cache" ("expiresAt");

-- =====================================================
-- 7b. zakat_nisab_rates
-- Gold/silver price snapshots for Nisab threshold calculation.
-- =====================================================

CREATE TABLE "zakat_nisab_rates" (
    "id"                  TEXT NOT NULL,
    "goldPricePerGram"    DECIMAL(18,6) NOT NULL,
    "silverPricePerGram"  DECIMAL(18,6) NOT NULL,
    "currency"            CHAR(3) NOT NULL DEFAULT 'USD',
    "effectiveDate"       DATE NOT NULL,
    "nisabGoldGrams"      DECIMAL(8,3) NOT NULL DEFAULT 85,
    "nisabSilverGrams"    DECIMAL(8,3) NOT NULL DEFAULT 595,
    "nisabValueGold"      DECIMAL(18,4) NOT NULL,
    "nisabValueSilver"    DECIMAL(18,4) NOT NULL,
    "source"              TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zakat_nisab_rates_pkey" PRIMARY KEY ("id")
);

-- One rate record per currency per day
CREATE UNIQUE INDEX "zakat_nisab_rates_currency_effectiveDate_key"
    ON "zakat_nisab_rates" ("currency", "effectiveDate");

CREATE INDEX "zakat_nisab_rates_effectiveDate_idx"
    ON "zakat_nisab_rates" ("effectiveDate");

-- =====================================================
-- 7c. zakat_calculations
-- User's saved Zakat calculation results.
-- userId is nullable to support guest calculations.
-- =====================================================

CREATE TABLE "zakat_calculations" (
    "id"                   TEXT NOT NULL,
    "userId"               TEXT,                              -- nullable (guest support)
    "goldGrams"            DECIMAL(12,4) NOT NULL DEFAULT 0,
    "silverGrams"          DECIMAL(12,4) NOT NULL DEFAULT 0,
    "cashSavings"          DECIMAL(18,4) NOT NULL DEFAULT 0,
    "investments"          DECIMAL(18,4) NOT NULL DEFAULT 0,
    "businessAssets"       DECIMAL(18,4) NOT NULL DEFAULT 0,
    "receivables"          DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalZakatableAssets" DECIMAL(18,4) NOT NULL,
    "nisabThreshold"       DECIMAL(18,4) NOT NULL,
    "zakatDue"             DECIMAL(18,4) NOT NULL,
    "zakatableAboveNisab"  BOOLEAN NOT NULL,
    "currency"             CHAR(3) NOT NULL DEFAULT 'USD',
    "nisabRateId"          TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zakat_calculations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "zakat_calculations_userId_idx"
    ON "zakat_calculations" ("userId");

CREATE INDEX "zakat_calculations_createdAt_idx"
    ON "zakat_calculations" ("createdAt");

-- FK to users (SET NULL if user deleted)
ALTER TABLE "zakat_calculations"
    ADD CONSTRAINT "zakat_calculations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- FK to rate snapshot (SET NULL if rate deleted)
ALTER TABLE "zakat_calculations"
    ADD CONSTRAINT "zakat_calculations_nisabRateId_fkey"
    FOREIGN KEY ("nisabRateId") REFERENCES "zakat_nisab_rates" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- 7d. azkar_categories
-- Admin-managed category groups for azkar items.
-- =====================================================

CREATE TABLE "azkar_categories" (
    "id"           TEXT NOT NULL,
    "slug"         TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "arabicName"   TEXT NOT NULL,
    "description"  TEXT,
    "iconName"     TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "azkar_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "azkar_categories_slug_key"
    ON "azkar_categories" ("slug");

CREATE INDEX "azkar_categories_isActive_idx"
    ON "azkar_categories" ("isActive");

-- =====================================================
-- 7e. azkar_items
-- Individual dhikr / supplication entries.
-- =====================================================

CREATE TABLE "azkar_items" (
    "id"              TEXT NOT NULL,
    "categoryId"      TEXT NOT NULL,
    "arabic"          TEXT NOT NULL,
    "transliteration" TEXT,
    "translation"     TEXT NOT NULL,
    "repetitions"     INTEGER NOT NULL DEFAULT 1,
    "reference"       TEXT,
    "audioUrl"        TEXT,
    "displayOrder"    INTEGER NOT NULL DEFAULT 0,
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "azkar_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "azkar_items_categoryId_idx"
    ON "azkar_items" ("categoryId");

CREATE INDEX "azkar_items_isActive_idx"
    ON "azkar_items" ("isActive");

ALTER TABLE "azkar_items"
    ADD CONSTRAINT "azkar_items_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "azkar_categories" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- 7f. tasbih_sessions
-- User's dhikr counter sessions.
-- =====================================================

CREATE TABLE "tasbih_sessions" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "phrase"       TEXT NOT NULL,
    "arabicPhrase" TEXT,
    "count"        INTEGER NOT NULL,
    "target"       INTEGER NOT NULL DEFAULT 33,
    "isCompleted"  BOOLEAN NOT NULL DEFAULT false,
    "sessionDate"  DATE NOT NULL DEFAULT CURRENT_DATE,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasbih_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasbih_sessions_userId_idx"
    ON "tasbih_sessions" ("userId");

-- Composite index for efficient per-user daily history queries
CREATE INDEX "tasbih_sessions_userId_sessionDate_idx"
    ON "tasbih_sessions" ("userId", "sessionDate");

ALTER TABLE "tasbih_sessions"
    ADD CONSTRAINT "tasbih_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- 7g. ai_assistant_conversations
-- Conversation thread containers for the Utilities AI Assistant.
-- Kept separate from the Learning Platform's ai_chat_messages table.
-- =====================================================

CREATE TABLE "ai_assistant_conversations" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "title"     TEXT,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_assistant_conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_assistant_conversations_userId_idx"
    ON "ai_assistant_conversations" ("userId");

-- Index for filtering active conversations per user
CREATE INDEX "ai_assistant_conversations_userId_isActive_idx"
    ON "ai_assistant_conversations" ("userId", "isActive");

ALTER TABLE "ai_assistant_conversations"
    ADD CONSTRAINT "ai_assistant_conversations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- 7h. ai_assistant_logs
-- Individual message turns within a conversation.
-- =====================================================

CREATE TABLE "ai_assistant_logs" (
    "id"               TEXT NOT NULL,
    "conversationId"   TEXT NOT NULL,
    "role"             "AiAssistantRole" NOT NULL,
    "content"          TEXT NOT NULL,
    "promptTokens"     INTEGER,
    "completionTokens" INTEGER,
    "totalTokens"      INTEGER,
    "modelUsed"        TEXT,
    "latencyMs"        INTEGER,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_assistant_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_assistant_logs_conversationId_idx"
    ON "ai_assistant_logs" ("conversationId");

-- Composite index for chronological message fetch within a conversation
CREATE INDEX "ai_assistant_logs_conversationId_createdAt_idx"
    ON "ai_assistant_logs" ("conversationId", "createdAt");

ALTER TABLE "ai_assistant_logs"
    ADD CONSTRAINT "ai_assistant_logs_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ai_assistant_conversations" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

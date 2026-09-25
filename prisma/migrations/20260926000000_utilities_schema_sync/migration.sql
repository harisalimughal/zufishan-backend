-- Brings the migration chain in line with schema.prisma for the Daily Utilities / AI Assistant
-- module, whose later schema changes were never captured as migrations (RAG tables,
-- AI log/conversation flags, prayer cache asrMethod).

-- CreateEnum
CREATE TYPE "RagSourceType" AS ENUM ('HELP_DOC', 'COURSE_METADATA', 'MARKETPLACE_METADATA', 'FAQ');

-- DropIndex
DROP INDEX "prayer_time_cache_latitude_longitude_date_method_key";

-- AlterTable
ALTER TABLE "ai_assistant_conversations" ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ai_assistant_logs" ADD COLUMN     "errorStatus" TEXT,
ADD COLUMN     "feedbackComment" TEXT,
ADD COLUMN     "isAdversarial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOutOfScope" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRedirected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rating" TEXT,
ADD COLUMN     "retrievedChunkCount" INTEGER,
ADD COLUMN     "topSimilarityScore" DOUBLE PRECISION,
ADD COLUMN     "topicCategory" TEXT;

-- AlterTable
ALTER TABLE "prayer_time_cache" ADD COLUMN     "asrMethod" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tasbih_sessions" ALTER COLUMN "sessionDate" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "rag_documents" (
    "id" TEXT NOT NULL,
    "sourceType" "RagSourceType" NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rag_documents_sourceType_isActive_idx" ON "rag_documents"("sourceType", "isActive");

-- CreateIndex
CREATE INDEX "rag_documents_sourceId_idx" ON "rag_documents"("sourceId");

-- CreateIndex
CREATE INDEX "rag_chunks_documentId_idx" ON "rag_chunks"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "rag_chunks_documentId_chunkIndex_key" ON "rag_chunks"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "ai_assistant_conversations_userId_updatedAt_idx" ON "ai_assistant_conversations"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ai_assistant_conversations_userId_isActive_updatedAt_idx" ON "ai_assistant_conversations"("userId", "isActive", "updatedAt");

-- CreateIndex
CREATE INDEX "ai_assistant_conversations_isFlagged_idx" ON "ai_assistant_conversations"("isFlagged");

-- CreateIndex
CREATE INDEX "ai_assistant_logs_createdAt_idx" ON "ai_assistant_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ai_assistant_logs_isRedirected_idx" ON "ai_assistant_logs"("isRedirected");

-- CreateIndex
CREATE INDEX "ai_assistant_logs_isAdversarial_idx" ON "ai_assistant_logs"("isAdversarial");

-- CreateIndex
CREATE INDEX "ai_assistant_logs_isOutOfScope_idx" ON "ai_assistant_logs"("isOutOfScope");

-- CreateIndex
CREATE INDEX "ai_assistant_logs_isFlagged_idx" ON "ai_assistant_logs"("isFlagged");

-- CreateIndex
CREATE INDEX "ai_assistant_logs_topicCategory_idx" ON "ai_assistant_logs"("topicCategory");

-- CreateIndex
CREATE INDEX "ai_assistant_logs_errorStatus_idx" ON "ai_assistant_logs"("errorStatus");

-- CreateIndex
CREATE INDEX "ai_assistant_logs_rating_idx" ON "ai_assistant_logs"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_time_cache_latitude_longitude_date_method_asrMethod_key" ON "prayer_time_cache"("latitude", "longitude", "date", "method", "asrMethod");

-- AddForeignKey
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "rag_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;


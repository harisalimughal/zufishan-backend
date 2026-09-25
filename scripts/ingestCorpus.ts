/**
 * Corpus Ingestion Script — Zufishan AI Assistant
 *
 * Seeds the RAG knowledge base with:
 *   1. Platform help documentation (static articles)
 *   2. FAQ entries
 *   3. Live course metadata (fetched from the database)
 *
 * Run:
 *   npx tsx scripts/ingestCorpus.ts
 *
 * Safe to re-run — uses upsert semantics throughout.
 * Requires DATABASE_URL and GEMINI_API_KEY to be set in .env
 */

import dotenv from 'dotenv'
dotenv.config()

import { prisma } from '../src/config/prisma'
import {
  ingestHelpDoc,
  ingestFaqs,
  ingestCourseMetadata,
} from '../src/services/ai-services/ingestPipeline'
import { HELP_DOCS } from '../src/services/ai-services/corpus/helpDocs'
import { FAQS } from '../src/services/ai-services/corpus/faqs'

async function main() {
  console.log('🚀 Zufishan RAG Corpus Ingestion — Starting...\n')

  // ── 1. Help documentation ──────────────────────────────────────────────────
  console.log('📄 Ingesting help documentation...')
  for (const doc of HELP_DOCS) {
    await ingestHelpDoc(doc.title, doc.content, doc.url)
  }

  // ── 2. FAQs ────────────────────────────────────────────────────────────────
  console.log('\n❓ Ingesting FAQs...')
  await ingestFaqs(FAQS)

  // ── 3. Course metadata (live from DB) ──────────────────────────────────────
  console.log('\n📚 Ingesting course metadata from database...')
  await ingestCourseMetadata()

  // ── Summary ────────────────────────────────────────────────────────────────
  const docCount = await prisma.ragDocument.count({ where: { isActive: true } })
  const chunkCount = await prisma.ragChunk.count()
  console.log(`\n✅ Ingestion complete!`)
  console.log(`   Total documents: ${docCount}`)
  console.log(`   Total chunks:    ${chunkCount}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ Ingestion failed:', err)
  prisma.$disconnect()
  process.exit(1)
})

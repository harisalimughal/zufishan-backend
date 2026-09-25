/**
 * RAG — Ingest Pipeline
 *
 * Provides functions to ingest content into the RAG knowledge base:
 * - ingestDocument   — low-level: create RagDocument + embed chunks
 * - ingestCourseMetadata — pull all active Course records from DB and ingest
 * - ingestHelpDoc    — ingest a help documentation entry
 * - ingestFaq        — ingest FAQ question/answer pairs
 * - ingestMarketplaceItem — ingest a marketplace catalogue item description
 *
 * Run via: npx tsx scripts/ingestCorpus.ts
 */

import { prisma } from '../../config/prisma'
import { upsertChunks } from './vectorStore'
import type { RagSourceType } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngestInput {
  sourceType: RagSourceType
  title: string
  content: string
  sourceId?: string  // FK to a platform entity (e.g., Course.id)
  url?: string
}

export interface FaqEntry {
  question: string
  answer: string
  category?: string
}

export interface MarketplaceItem {
  id: string
  title: string
  description: string
  category?: string
  price?: string
  url?: string
}

// ─── Core ingest function ─────────────────────────────────────────────────────

/**
 * Creates or updates a RagDocument and re-embeds all its chunks.
 * Uses the (sourceType + title) pair to detect existing documents for upsert.
 */
export async function ingestDocument(input: IngestInput): Promise<string> {
  // Upsert the document record
  const existing = await prisma.ragDocument.findFirst({
    where: { sourceType: input.sourceType, title: input.title },
    select: { id: true },
  })

  let documentId: string

  if (existing) {
    await prisma.ragDocument.update({
      where: { id: existing.id },
      data: {
        content: input.content,
        sourceId: input.sourceId,
        url: input.url,
        isActive: true,
      },
    })
    documentId = existing.id
  } else {
    const doc = await prisma.ragDocument.create({
      data: {
        sourceType: input.sourceType,
        title: input.title,
        content: input.content,
        sourceId: input.sourceId ?? null,
        url: input.url ?? null,
      },
    })
    documentId = doc.id
  }

  // Chunk + embed + upsert into rag_chunks
  const chunkCount = await upsertChunks(documentId, input.content)

  console.log(`[Ingest] "${input.title}" (${input.sourceType}) → ${chunkCount} chunks`)
  return documentId
}

// ─── Course metadata ingestion ─────────────────────────────────────────────────

/**
 * Pulls all active Course records and ingests their metadata.
 * Safe to run repeatedly — uses upsert semantics.
 */
export async function ingestCourseMetadata(): Promise<void> {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      level: true,
      instructorName: true,
      detailSlug: true,
    },
  })

  for (const course of courses) {
    const content = [
      `Course Title: ${course.title}`,
      `Category: ${course.category}`,
      `Level: ${course.level}`,
      `Instructor: ${course.instructorName}`,
      `Description: ${course.description}`,
    ].join('\n')

    await ingestDocument({
      sourceType: 'COURSE_METADATA',
      title: course.title,
      content,
      sourceId: course.id,
      url: `/courses/${course.detailSlug}`,
    })
  }

  console.log(`[Ingest] Completed course metadata ingestion (${courses.length} courses)`)
}

// ─── FAQ ingestion ─────────────────────────────────────────────────────────────

/**
 * Ingests an array of FAQ entries. Each Q&A pair becomes one document.
 */
export async function ingestFaqs(faqs: FaqEntry[]): Promise<void> {
  for (const faq of faqs) {
    const content = `Question: ${faq.question}\n\nAnswer: ${faq.answer}`
    const title = faq.question.length > 80
      ? faq.question.slice(0, 77) + '...'
      : faq.question

    await ingestDocument({
      sourceType: 'FAQ',
      title,
      content,
    })
  }

  console.log(`[Ingest] Completed FAQ ingestion (${faqs.length} entries)`)
}

// ─── Help doc ingestion ────────────────────────────────────────────────────────

/**
 * Ingests a help documentation article. Provide title and full markdown/text body.
 */
export async function ingestHelpDoc(title: string, content: string, url?: string): Promise<void> {
  await ingestDocument({ sourceType: 'HELP_DOC', title, content, url })
}

// ─── Marketplace item ingestion ────────────────────────────────────────────────

/**
 * Ingests marketplace catalogue items.
 */
export async function ingestMarketplaceItems(items: MarketplaceItem[]): Promise<void> {
  for (const item of items) {
    const content = [
      `Item: ${item.title}`,
      item.category ? `Category: ${item.category}` : '',
      item.price ? `Price: ${item.price}` : '',
      `Description: ${item.description}`,
    ].filter(Boolean).join('\n')

    await ingestDocument({
      sourceType: 'MARKETPLACE_METADATA',
      title: item.title,
      content,
      sourceId: item.id,
      url: item.url,
    })
  }

  console.log(`[Ingest] Completed marketplace ingestion (${items.length} items)`)
}

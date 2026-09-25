/**
 * RAG — Vector Store
 *
 * Stores and retrieves text chunk embeddings using PostgreSQL (JSONB).
 * Cosine similarity is computed in-application over a pre-filtered candidate set.
 *
 * Retrieval strategy:
 * 1. Pre-filter RagChunk by active sourceTypes (metadata filter in SQL).
 * 2. Fetch top CANDIDATE_MULTIPLIER × k candidates by LIMIT.
 * 3. Compute cosine similarity in-process.
 * 4. Return top-k ranked results above the minimum score threshold.
 */

import { prisma } from '../../config/prisma'
import { generateEmbedding, generateEmbeddingsBatch, cosineSimilarity } from './embeddings'
import { chunkText, estimateTokenCount } from './chunker'
import type { RagSourceType } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RankedChunk {
  chunkId: string
  documentId: string
  documentTitle: string
  sourceType: RagSourceType
  content: string
  score: number          // cosine similarity [0, 1]
  url?: string | null
}

export interface SearchOptions {
  /** Number of top results to return. Default: 5 */
  k?: number
  /** Filter to specific source types. Omit to search all. */
  sourceTypes?: RagSourceType[]
  /** Minimum similarity score to include in results. Default: 0.40 */
  minScore?: number
}

const DEFAULT_K = 5
const DEFAULT_MIN_SCORE = 0.40
const CANDIDATE_MULTIPLIER = 6   // fetch k×6 candidates then re-rank

// ─── Upsert chunks for a document ─────────────────────────────────────────────

/**
 * Embeds and stores all chunks for a given document.
 * Uses upsert on (documentId, chunkIndex) to allow re-ingestion.
 */
export async function upsertChunks(
  documentId: string,
  rawText: string,
): Promise<number> {
  const chunks = chunkText(rawText)
  if (chunks.length === 0) return 0

  const embeddings = await generateEmbeddingsBatch(chunks)

  for (let i = 0; i < chunks.length; i++) {
    await prisma.ragChunk.upsert({
      where: { documentId_chunkIndex: { documentId, chunkIndex: i } },
      create: {
        documentId,
        chunkIndex: i,
        content: chunks[i],
        embedding: embeddings[i] as unknown as never, // stored as JSONB
        tokenCount: estimateTokenCount(chunks[i]),
      },
      update: {
        content: chunks[i],
        embedding: embeddings[i] as unknown as never,
        tokenCount: estimateTokenCount(chunks[i]),
      },
    })
  }

  // Remove stale chunks if document was re-ingested with fewer chunks
  await prisma.ragChunk.deleteMany({
    where: { documentId, chunkIndex: { gte: chunks.length } },
  })

  return chunks.length
}

// ─── Semantic search ───────────────────────────────────────────────────────────

/**
 * Performs semantic retrieval:
 * 1. Embeds the query.
 * 2. Fetches candidate chunks from the DB (pre-filtered by sourceType).
 * 3. Scores each candidate via cosine similarity.
 * 4. Returns top-k chunks above minScore, ranked by score descending.
 */
export async function semanticSearch(
  query: string,
  opts: SearchOptions = {},
): Promise<RankedChunk[]> {
  const k = opts.k ?? DEFAULT_K
  const minScore = opts.minScore ?? DEFAULT_MIN_SCORE
  const candidateLimit = k * CANDIDATE_MULTIPLIER

  const queryEmbedding = await generateEmbedding(query)

  // Fetch candidate chunks with document metadata
  const candidates = await prisma.ragChunk.findMany({
    where: opts.sourceTypes?.length
      ? {
          document: {
            isActive: true,
            sourceType: { in: opts.sourceTypes },
          },
        }
      : { document: { isActive: true } },
    take: candidateLimit,
    orderBy: { createdAt: 'desc' }, // approximate recency pre-filter
    select: {
      id: true,
      documentId: true,
      content: true,
      embedding: true,
      document: {
        select: {
          title: true,
          sourceType: true,
          url: true,
        },
      },
    },
  })

  // Score and rank in-process
  interface CandidateRow {
    id: string
    documentId: string
    content: string
    embedding: unknown
    document: {
      title: string
      sourceType: RagSourceType
      url: string | null
    }
  }

  const scored: RankedChunk[] = (candidates as CandidateRow[])
    .map((chunk: CandidateRow) => {
      const embedding = chunk.embedding as number[]
      const score = cosineSimilarity(queryEmbedding, embedding)
      return {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.document.title,
        sourceType: chunk.document.sourceType,
        content: chunk.content,
        score,
        url: chunk.document.url,
      } satisfies RankedChunk
    })
    .filter((c: RankedChunk) => c.score >= minScore)
    .sort((a: RankedChunk, b: RankedChunk) => b.score - a.score)
    .slice(0, k)

  return scored
}

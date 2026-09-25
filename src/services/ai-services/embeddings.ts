/**
 * RAG — Embeddings Module
 *
 * Wraps the Gemini text-embedding-004 REST endpoint.
 * Returns 768-dimensional float vectors suitable for cosine similarity.
 *
 * Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent
 */
import { env } from '../../config/env'
import { ApiError } from '../../utils/apiError'
import { logger } from '../../utils/logger'

const EMBED_MODEL = 'text-embedding-004'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const EMBED_TIMEOUT_MS = 15_000

// ─── Single embedding ─────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!env.GEMINI_API_KEY) {
    throw new ApiError(503, 'AI Assistant is not configured on this server.')
  }
  const url = `${GEMINI_BASE}/models/${EMBED_MODEL}:embedContent?key=${env.GEMINI_API_KEY}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.error({ status: res.status, body }, 'Gemini embedding failed')
      throw ApiError.internal('Failed to process AI embeddings.')
    }

    const data = (await res.json()) as { embedding: { values: number[] } }
    return data.embedding.values
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw ApiError.internal('Gemini embedding request timed out')
    }
    if (err instanceof ApiError) throw err
    logger.error({ err }, 'Unexpected AI embedding error')
    throw ApiError.internal('Failed to process AI embeddings.')
  } finally {
    clearTimeout(timer)
  }
}

// ─── Batch embeddings (sequential to stay within Gemini free quota) ───────────

/**
 * Generates embeddings for a list of texts sequentially.
 * For production workloads, consider batching via the batchEmbedContents endpoint.
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  for (const text of texts) {
    const embedding = await generateEmbedding(text)
    results.push(embedding)
  }
  return results
}

// ─── Cosine similarity helper ─────────────────────────────────────────────────

/**
 * Computes the cosine similarity between two same-length float vectors.
 * Returns a value in [-1, 1] where 1 = identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

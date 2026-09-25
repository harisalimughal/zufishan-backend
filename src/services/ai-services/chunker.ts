/**
 * RAG — Text Chunker
 *
 * Splits a document into overlapping text chunks that fit within the
 * embedding model's context window (~512 tokens ≈ 380 words for Gemini).
 *
 * Strategy:
 * - Split text into sentences (on . ! ? boundary).
 * - Accumulate sentences into chunks of ≤ CHUNK_WORD_LIMIT words.
 * - Carry an OVERLAP_SENTENCE_COUNT sentence overlap between adjacent chunks
 *   to preserve semantic continuity across chunk boundaries.
 */

export interface ChunkOptions {
  /** Target maximum words per chunk. Default: 380 */
  chunkWordLimit?: number
  /** Number of trailing sentences from previous chunk to prepend. Default: 2 */
  overlapSentenceCount?: number
}

const DEFAULT_CHUNK_WORD_LIMIT = 380
const DEFAULT_OVERLAP_SENTENCES = 2

// ─── Sentence splitter ────────────────────────────────────────────────────────

function splitIntoSentences(text: string): string[] {
  // Splits on . ! ? followed by whitespace or end of string.
  // Keeps delimiter attached to the preceding sentence.
  return text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

// ─── Main chunker ─────────────────────────────────────────────────────────────

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const CHUNK_LIMIT = opts.chunkWordLimit ?? DEFAULT_CHUNK_WORD_LIMIT
  const OVERLAP = opts.overlapSentenceCount ?? DEFAULT_OVERLAP_SENTENCES

  const sentences = splitIntoSentences(text)
  if (sentences.length === 0) return []

  const chunks: string[] = []
  let current: string[] = []
  let currentWords = 0

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    const sw = wordCount(sentence)

    // If this single sentence is already over the limit, add it as its own chunk
    if (sw >= CHUNK_LIMIT) {
      if (current.length > 0) {
        chunks.push(current.join(' '))
        current = []
        currentWords = 0
      }
      chunks.push(sentence)
      continue
    }

    if (currentWords + sw > CHUNK_LIMIT && current.length > 0) {
      // Flush current chunk
      chunks.push(current.join(' '))

      // Build overlap: carry last N sentences into the next chunk
      const overlapSentences = current.slice(-OVERLAP)
      current = [...overlapSentences, sentence]
      currentWords = overlapSentences.reduce((s, o) => s + wordCount(o), 0) + sw
    } else {
      current.push(sentence)
      currentWords += sw
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(' '))
  }

  return chunks
}

// ─── Token estimate helper (rough: 1 word ≈ 1.3 tokens for English/Arabic) ───

export function estimateTokenCount(text: string): number {
  return Math.ceil(wordCount(text) * 1.3)
}

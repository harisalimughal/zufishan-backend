/**
 * RAG — Answer Generator
 *
 * Calls the Gemini generateContent REST endpoint to produce a grounded answer
 * from the assembled context prompt.
 *
 * Safety settings are configured to block harmful content at the BLOCK_MEDIUM_AND_ABOVE
 * threshold on all harm categories, providing an additional provider-level safety net
 * on top of the application-level guardrails.
 *
 * Failure modes handled:
 * - Network timeout (30s) → ApiError.internal with a user-friendly message
 * - Provider HTTP error   → ApiError.internal with status code
 * - Empty/blocked response → ApiError.internal with reason
 */

import { env } from '../../config/env'
import { ApiError } from '../../utils/apiError'
import { logger } from '../../utils/logger'

const GENERATION_MODEL = 'gemini-1.5-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const GENERATE_TIMEOUT_MS = 30_000

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  /** Max tokens to generate. Default: 1024 */
  maxOutputTokens?: number
  /** Temperature [0,1]. Default: 0.2 (low for factual grounding) */
  temperature?: number
}

export interface GenerateResult {
  text: string
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  modelUsed: string
  latencyMs: number
}

// ─── Gemini API response shape (partial) ─────────────────────────────────────

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

// ─── Safety settings ──────────────────────────────────────────────────────────

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
]

// ─── Generator ────────────────────────────────────────────────────────────────

export async function generateAnswer(
  prompt: string,
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const url = `${GEMINI_BASE}/models/${GENERATION_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS)
  const startTime = Date.now()

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.2,
          maxOutputTokens: opts.maxOutputTokens ?? 1024,
          candidateCount: 1,
        },
        safetySettings: SAFETY_SETTINGS,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.error({ status: res.status, body }, 'Gemini generation failed')
      throw ApiError.internal('Failed to generate AI response. Please try again later.')
    }

    const data = (await res.json()) as GeminiResponse
    const latencyMs = Date.now() - startTime

    // Extract generated text
    const candidate = data.candidates?.[0]
    if (!candidate) {
      throw ApiError.internal('AI provider returned no candidates')
    }

    const finishReason = candidate.finishReason
    if (finishReason === 'SAFETY') {
      throw ApiError.internal('AI provider blocked this response for safety reasons')
    }

    const text = candidate.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    if (!text.trim()) {
      throw ApiError.internal('AI provider returned an empty response')
    }

    // Token accounting
    const usage = data.usageMetadata
    const promptTokens = usage?.promptTokenCount ?? null
    const completionTokens = usage?.candidatesTokenCount ?? null
    const totalTokens = usage?.totalTokenCount ?? null

    return {
      text: text.trim(),
      promptTokens,
      completionTokens,
      totalTokens,
      modelUsed: GENERATION_MODEL,
      latencyMs,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw ApiError.internal('AI provider did not respond in time. Please try again.')
    }
    if (err instanceof ApiError) throw err
    logger.error({ err }, 'Unexpected AI generation error')
    throw ApiError.internal('Failed to generate AI response. Please try again later.')
  } finally {
    clearTimeout(timer)
  }
}

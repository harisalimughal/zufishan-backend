/**
 * AI Rate Limiter — Per-User Sliding Window
 *
 * Enforces a per-user rate limit on the AI chat endpoint:
 *   20 requests per 15-minute window per userId.
 *
 * Implementation: in-memory sliding window using a Map<userId, timestamps[]>.
 * - Suitable for single-process development / single-instance deployments.
 * - For multi-instance production: swap the Map for Redis (ZADD + ZCOUNT on a
 *   sorted set keyed by userId, with a 15-minute TTL).
 *
 * Cleanup: stale entries are pruned on each check to avoid unbounded memory growth.
 */

import { ApiError } from './apiError'

// ─── Configuration ────────────────────────────────────────────────────────────

const WINDOW_MS = 15 * 60 * 1000   // 15 minutes
const MAX_REQUESTS = 20             // requests per window per user

// ─── Store ────────────────────────────────────────────────────────────────────

/** userId → array of request timestamps (epoch ms) within the current window */
const store = new Map<string, number[]>()

// ─── Rate limiter ─────────────────────────────────────────────────────────────

/**
 * Checks and records a request attempt for the given userId.
 *
 * @throws ApiError (429) if the user has exceeded the rate limit.
 */
export function checkRateLimit(userId: string): void {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  // Get existing timestamps, pruning stale ones
  const timestamps = (store.get(userId) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = timestamps[0]
    const resetInMs = oldestInWindow + WINDOW_MS - now
    const resetInSec = Math.ceil(resetInMs / 1000)

    throw new ApiError(
      429,
      `AI Assistant rate limit reached. You have sent ${MAX_REQUESTS} messages in the last 15 minutes. ` +
      `Please wait ${resetInSec} seconds before sending another message.`,
    )
  }

  // Record this request
  timestamps.push(now)
  store.set(userId, timestamps)
}

/**
 * Returns the number of requests the user has made in the current window.
 * Useful for including rate-limit metadata in API responses.
 */
export function getRateLimitStatus(userId: string): {
  used: number
  limit: number
  windowMs: number
  resetsInMs: number
} {
  const now = Date.now()
  const windowStart = now - WINDOW_MS
  const timestamps = (store.get(userId) ?? []).filter((t) => t > windowStart)

  const oldest = timestamps[0]
  const resetsInMs = oldest ? Math.max(0, oldest + WINDOW_MS - now) : 0

  return {
    used: timestamps.length,
    limit: MAX_REQUESTS,
    windowMs: WINDOW_MS,
    resetsInMs,
  }
}

/**
 * RAG — Scope Guardrail
 *
 * Handles two fast-path cases before the full RAG pipeline runs:
 *
 * 1. GREETING detection — user sends a social greeting (hello, salam, etc.)
 *    → Return a warm Zufishan-scoped welcome instead of doing a retrieval call.
 *
 * 2. OFF-TOPIC detection — retrieval returned no relevant results (all scores
 *    below threshold), indicating the question is outside the platform corpus.
 *    → Return a polite refusal that re-anchors the user to Zufishan topics.
 *
 * This keeps general world-knowledge questions (e.g. "What is the capital of
 * France?") from leaking through to the LLM even if the system prompt alone
 * would reject them, adding a defence-in-depth layer.
 */

// ─── Greeting patterns ────────────────────────────────────────────────────────

const GREETING_PATTERNS: RegExp[] = [
  /^(hi|hey|hello|good\s*(morning|afternoon|evening|night)|howdy|yo|sup|hiya)\b/i,
  /^(assalamu?\s*alaikum|assalam|salam|salaam|wa\s*alaikum|as-salamu)\b/i,
  /^(jazak(allahu?)?|jzk|shukran|thank(s| you)|barakallah|masha?allah)\b/i,
  /^(how are you|how r u|how do you do|what'?s up)\b/i,
  /^(good (to|2) (see|meet) you)\b/i,
]

/**
 * Returns true if the message is a greeting / social opener.
 */
export function isGreeting(message: string): boolean {
  const normalized = message.trim()
  return GREETING_PATTERNS.some((pattern) => pattern.test(normalized))
}

// ─── Greeting response ─────────────────────────────────────────────────────────

export const GREETING_RESPONSE =
  "Wa alaikum assalam! 👋 Welcome to Zufishan — your Islamic learning companion.\n\n" +
  "I'm the Zufishan AI Assistant. I can help you with:\n" +
  "• **Platform features** — navigation, account settings, how things work\n" +
  "• **Courses** — finding the right course, understanding content, learning paths\n" +
  "• **Marketplace** — browsing catalogue items, understanding what's available\n" +
  "• **Platform FAQs** — quick answers to common questions\n\n" +
  "What can I help you with today? 🌙"

// ─── Out-of-scope detection ────────────────────────────────────────────────────

/**
 * Returns true if none of the retrieved chunks meet the minimum relevance
 * threshold, meaning the query is likely outside the Zufishan knowledge base.
 *
 * @param scores  Array of cosine similarity scores from semanticSearch results
 * @param minScore  Minimum acceptable similarity (default 0.40)
 */
export function isOutOfScope(scores: number[], minScore = 0.40): boolean {
  if (scores.length === 0) return true
  return scores.every((s) => s < minScore)
}

// ─── Out-of-scope refusal ─────────────────────────────────────────────────────

export const OUT_OF_SCOPE_RESPONSE =
  "I'm the Zufishan Platform Assistant, and I'm only able to help with questions about:\n\n" +
  "• Zufishan platform features and how to use them\n" +
  "• Courses, learning paths, and educational content\n" +
  "• The Zufishan marketplace catalogue\n" +
  "• Platform FAQs and support\n\n" +
  "Your question seems to be outside my area of knowledge. Is there something Zufishan-specific I can help you with? 😊"

import type { PromptComplexity } from '../../types/index.js'

// ~4 characters per token is a standard rough approximation for English text.
// Not a real tokenizer — good enough for a relative size/complexity signal,
// not for exact provider billing.
const CHARS_PER_TOKEN = 4

const COMPLEXITY_THRESHOLDS: Record<Exclude<PromptComplexity, 'High'>, number> = {
  Low: 800,
  Medium: 2500,
}

export function countCharacters(text: string): number {
  return text.length
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export function estimateTokens(text: string): number {
  return Math.ceil(countCharacters(text) / CHARS_PER_TOKEN)
}

export function classifyComplexity(estimatedTokenCount: number): PromptComplexity {
  if (estimatedTokenCount < COMPLEXITY_THRESHOLDS.Low) {
    return 'Low'
  }
  if (estimatedTokenCount < COMPLEXITY_THRESHOLDS.Medium) {
    return 'Medium'
  }
  return 'High'
}

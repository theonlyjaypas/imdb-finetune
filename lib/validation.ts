export const MAX_CHARS = 800
export const MIN_CHARS = 1

export interface ValidationResult {
  isValid: boolean
  message: string
  charCount: number
  percentFull: number
}

export function validateReview(text: string): ValidationResult {
  const charCount = text.length

  if (charCount === 0) {
    return {
      isValid: false,
      message: `Enter at least ${MIN_CHARS} character`,
      charCount: 0,
      percentFull: 0,
    }
  }

  if (charCount > MAX_CHARS) {
    return {
      isValid: false,
      message: `Review is ${charCount - MAX_CHARS} characters over the ${MAX_CHARS} limit (will be truncated)`,
      charCount,
      percentFull: 100,
    }
  }

  const percentFull = (charCount / MAX_CHARS) * 100

  return {
    isValid: true,
    message: `${charCount}/${MAX_CHARS} characters`,
    charCount,
    percentFull,
  }
}

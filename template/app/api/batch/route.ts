import { NextRequest, NextResponse } from 'next/server'

const MAX_BATCH_SIZE = 1000
const MAX_REVIEW_LENGTH = 10000
const MODEL_ENDPOINT = process.env.MODEL_ENDPOINT || 'http://localhost:8080/predict/batch'

export interface BatchResult {
  username?: string
  review: string
  sentiment: string
  confidence: number
}

interface BatchRequest {
  reviews: string[]
}

interface BatchResponse {
  results: Array<{ label: string; confidence: number; originalIndex: number }>
  skipped?: number
}

interface ModelError {
  index: number
  review: string
  error: string
}

function validateReviews(reviews: string[]): { valid: string[]; indices: number[]; errors: ModelError[] } {
  const valid: string[] = []
  const indices: number[] = []
  const errors: ModelError[] = []

  reviews.forEach((review, index) => {
    if (typeof review !== 'string') {
      errors.push({ index, review: String(review), error: 'Review must be a string' })
      return
    }

    const trimmed = review.trim()

    if (!trimmed) {
      errors.push({ index, review, error: 'Review cannot be empty' })
      return
    }

    if (trimmed.length > MAX_REVIEW_LENGTH) {
      errors.push({
        index,
        review: trimmed.substring(0, 50) + '...',
        error: `Review exceeds maximum length of ${MAX_REVIEW_LENGTH} characters`,
      })
      return
    }

    valid.push(trimmed)
    indices.push(index)
  })

  return { valid, indices, errors }
}

async function processBatch(reviews: string[], indices: number[]): Promise<BatchResponse> {
  try {
    const response = await fetch(MODEL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews }),
    })

    if (!response.ok) {
      throw new Error(`Model backend returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!Array.isArray(data.results)) {
      throw new Error('Invalid response format from model backend')
    }

    return {
      results: data.results.map((r: { label: string; confidence: number }, idx: number) => ({
        label: String(r.label),
        confidence: Number(r.confidence) || 0,
        originalIndex: indices[idx],
      })),
    }
  } catch (error) {
    console.error('Failed to call sentiment model backend:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: BatchRequest

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.reviews)) {
      return NextResponse.json(
        { error: 'Field "reviews" must be an array of strings' },
        { status: 400 }
      )
    }

    if (body.reviews.length === 0) {
      return NextResponse.json(
        { error: 'Reviews array cannot be empty' },
        { status: 400 }
      )
    }

    if (body.reviews.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} reviews. Received ${body.reviews.length}.`,
        },
        { status: 413 }
      )
    }

    const { valid, indices, errors } = validateReviews(body.reviews)

    if (valid.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid reviews after validation',
          details: errors,
        },
        { status: 400 }
      )
    }

    const batchResult = await processBatch(valid, indices)

    const response: BatchResponse = {
      results: batchResult.results,
    }

    if (errors.length > 0) {
      response.skipped = errors.length
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Batch API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

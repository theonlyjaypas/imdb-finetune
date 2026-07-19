import { NextRequest, NextResponse } from 'next/server'

interface ChatRequest {
  message: string
}

interface SentimentResponse {
  label: string
  confidence: number
}

interface ChatResponse {
  reply: string
  label?: string
  confidence?: number
}

async function classifySentiment(text: string): Promise<SentimentResponse> {
  try {
    const response = await fetch('http://localhost:8080/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    return {
      label: data.label,
      confidence: data.confidence,
    }
  } catch (error) {
    console.error('Failed to call sentiment model backend:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      )
    }

    const result = await classifySentiment(body.message)

    const response: ChatResponse = {
      reply: '',
      label: result.label,
      confidence: result.confidence,
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

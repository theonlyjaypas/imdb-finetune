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
  const modelUrl = process.env.MODEL_API_URL
  if (!modelUrl) {
    throw new Error('MODEL_API_URL environment variable is not set')
  }

  try {
    console.log('Calling model API at:', modelUrl)

    const response = await fetch(`${modelUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    console.log('Model API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Model API error:', errorText)
      throw new Error(`Model API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('Model API response:', data)

    return {
      label: data.label,
      confidence: data.confidence,
    }
  } catch (error) {
    console.error('Failed to call model API:', error)
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

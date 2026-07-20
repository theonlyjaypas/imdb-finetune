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
  const hfToken = process.env.HF_TOKEN
  console.log('HF_TOKEN set:', !!hfToken)

  if (!hfToken) {
    throw new Error('HF_TOKEN environment variable is not set')
  }

  try {
    console.log('Calling HuggingFace API with text:', text.substring(0, 50) + '...')

    const response = await fetch(
      'https://api-inference.huggingface.co/models/jayanthnagasai/imdb-qlora',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      }
    )

    console.log('HuggingFace API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HuggingFace API error:', errorText)
      throw new Error(`HuggingFace API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('HuggingFace API response data:', JSON.stringify(data).substring(0, 200))

    const predictions = Array.isArray(data) ? data[0] : data

    if (!predictions || !predictions.length) {
      throw new Error('No predictions returned from model')
    }

    const topPrediction = predictions[0]
    return {
      label: topPrediction.label,
      confidence: topPrediction.score,
    }
  } catch (error) {
    console.error('Failed to call sentiment model:', error)
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

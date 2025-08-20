import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiBase = process.env.LMSTUDIO_API_BASE
    
    if (!apiBase) {
      return NextResponse.json({ error: 'LM Studio not configured' }, { status: 400 })
    }

    // LM Studio 모델 목록 조회
    const response = await fetch(`${apiBase}/models`, {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      models: data.data || [],
      currentModel: data.data?.[0]?.id || 'none',
      apiBase: apiBase
    })

  } catch (error) {
    console.error('Error fetching LM Studio models:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch models from LM Studio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

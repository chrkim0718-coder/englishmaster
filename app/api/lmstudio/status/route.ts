import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiBase = process.env.LMSTUDIO_API_BASE
    
    if (!apiBase) {
      return NextResponse.json({ 
        connected: false, 
        error: 'LM Studio not configured',
        apiBase: null,
        currentModel: null
      })
    }

    // LM Studio 연결 및 모델 상태 확인
    const response = await fetch(`${apiBase}/models`, {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      return NextResponse.json({ 
        connected: false,
        error: `LM Studio API error: ${response.status}`,
        apiBase: apiBase,
        currentModel: null
      })
    }

    const data = await response.json()
    const currentModel = data.data?.[0]?.id || null
    
    return NextResponse.json({
      connected: true,
      apiBase: apiBase,
      currentModel: currentModel,
      totalModels: data.data?.length || 0,
      models: data.data?.map((model: any) => ({
        id: model.id,
        created: model.created
      })) || []
    })

  } catch (error) {
    console.error('Error checking LM Studio status:', error)
    return NextResponse.json({ 
      connected: false,
      error: 'Failed to connect to LM Studio',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiBase: process.env.LMSTUDIO_API_BASE || null,
      currentModel: null
    })
  }
}

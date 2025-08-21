import { NextRequest, NextResponse } from 'next/server'
import { setSelectedModel, getSelectedModel } from '@/lib/ai/model-state'

export async function POST(request: NextRequest) {
  try {
    const { modelName } = await request.json()
    
    if (!modelName) {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 })
    }

    // 전역 모델 설정
    setSelectedModel(modelName)
    
    return NextResponse.json({
      success: true,
      message: `LM Studio 모델이 ${modelName}으로 설정되었습니다`,
      selectedModel: modelName
    })

  } catch (error) {
    console.error('Error setting LM Studio model:', error)
    return NextResponse.json({ 
      error: 'Failed to set LM Studio model',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiBase = process.env.LMSTUDIO_API_BASE
    
    if (!apiBase) {
      return NextResponse.json({ error: 'LM Studio not configured' }, { status: 400 })
    }

    // 현재 설정된 기본 모델
    const defaultModel = process.env.LMSTUDIO_MODEL_NAME || 'none'
    const selectedModel = getSelectedModel()
    
    // 사용 가능한 모델 목록 조회
    const response = await fetch(`${apiBase}/models`, {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      defaultModel: defaultModel,
      selectedModel: selectedModel,
      currentModel: data.data?.[0]?.id || 'none',
      localServer: apiBase, // Add the base URL for connection testing
      availableModels: data.data?.map((model: any) => ({
        id: model.id,
        created: model.created,
        object: model.object
      })) || []
    })

  } catch (error) {
    console.error('Error getting LM Studio model settings:', error)
    return NextResponse.json({ 
      error: 'Failed to get LM Studio model settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

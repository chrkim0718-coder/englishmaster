import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { lmstudioUrl } = await request.json()
    
    if (!lmstudioUrl) {
      return NextResponse.json({
        success: false,
        error: 'LMStudio URL이 제공되지 않았습니다.'
      }, { status: 400 })
    }

    console.log('Testing LMStudio connection to:', lmstudioUrl)

    try {
      // 서버 사이드에서 LMStudio 연결 테스트
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${lmstudioUrl}/v1/models`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        console.log('LMStudio connection successful, models:', data)
        
        return NextResponse.json({
          success: true,
          connected: true,
          models: data?.data || [],
          message: 'LMStudio 서버에 성공적으로 연결되었습니다.'
        })
      } else {
        console.log('LMStudio response not ok:', response.status, response.statusText)
        return NextResponse.json({
          success: true,
          connected: false,
          error: `서버 응답 오류: ${response.status} ${response.statusText}`,
          message: 'LMStudio 서버가 올바르게 응답하지 않습니다.'
        })
      }
    } catch (error: any) {
      console.error('LMStudio connection error:', error)
      
      let errorMessage = '알 수 없는 오류가 발생했습니다.'
      let errorCode = 'UNKNOWN_ERROR'
      
      if (error.name === 'AbortError') {
        errorMessage = '연결 시간 초과 (5초). 서버가 응답하지 않습니다.'
        errorCode = 'TIMEOUT'
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = '연결 거부됨. LMStudio 서버가 실행되지 않았을 가능성이 높습니다.'
        errorCode = 'ECONNREFUSED'
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'URL을 찾을 수 없습니다. URL을 확인해주세요.'
        errorCode = 'ENOTFOUND'
      } else if (error.message?.includes('fetch')) {
        errorMessage = '네트워크 연결 오류가 발생했습니다.'
        errorCode = 'NETWORK_ERROR'
      }
      
      return NextResponse.json({
        success: true,
        connected: false,
        error: errorMessage,
        errorCode: errorCode,
        details: error.message,
        message: 'LMStudio 서버에 연결할 수 없습니다.'
      })
    }
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({
      success: false,
      error: 'API 요청 처리 중 오류가 발생했습니다.',
      details: error.message
    }, { status: 500 })
  }
}

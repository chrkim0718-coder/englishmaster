import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  console.log("🔄 GET /api/auth/update-password")
  return NextResponse.json({ 
    message: "Update password API is working",
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log("🔄 POST /api/auth/update-password - API called")
  
  try {
    // 요청 본문 파싱
    const body = await request.json()
    const { password, currentUrl } = body
    console.log("🔄 Password length:", password?.length)
    console.log("🔄 Current URL:", currentUrl)

    if (!password) {
      console.log("❌ No password provided")
      return NextResponse.json(
        { success: false, error: "새 비밀번호가 필요합니다." },
        { status: 400 }
      )
    }

    if (!currentUrl) {
      console.log("❌ No current URL provided")
      return NextResponse.json(
        { success: false, error: "현재 URL이 필요합니다." },
        { status: 400 }
      )
    }

    // 비밀번호 유효성 검사
    if (password.length < 8) {
      console.log("❌ Password too short")
      return NextResponse.json(
        { success: false, error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      )
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      console.log("❌ Password doesn't meet requirements")
      return NextResponse.json(
        { success: false, error: "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다." },
        { status: 400 }
      )
    }

    // URL에서 토큰 추출
    const url = new URL(currentUrl)
    const accessToken = url.searchParams.get('access_token') || 
                       new URLSearchParams(url.hash.substring(1)).get('access_token')
    const type = url.searchParams.get('type') || 
                 new URLSearchParams(url.hash.substring(1)).get('type')
    
    console.log("🔑 Access token present:", !!accessToken)
    console.log("🔑 Type:", type)

    if (!accessToken || type !== 'recovery') {
      console.log("❌ Invalid token or type")
      return NextResponse.json(
        { success: false, error: "유효한 비밀번호 재설정 토큰이 아닙니다." },
        { status: 401 }
      )
    }

    // Service Role 클라이언트로 사용자 확인 및 업데이트
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log("🔄 Validating token with Supabase...")
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
    
    if (userError || !user) {
      console.error("❌ Token validation failed:", userError?.message)
      return NextResponse.json(
        { success: false, error: userError?.message || "유효하지 않은 토큰입니다." },
        { status: 401 }
      )
    }

    console.log("✅ User validated:", user.email)

    // Service Role로 비밀번호 업데이트
    console.log("🔄 Updating password...")
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    )

    if (updateError) {
      console.error("❌ Password update failed:", updateError.message)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 400 }
      )
    }

    console.log("✅ Password updated successfully for user:", user.email)
    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다."
    })

  } catch (error) {
    console.error("❌ API error:", error)
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

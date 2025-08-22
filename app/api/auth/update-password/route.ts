import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  console.log("🔄 GET request to update-password API")
  return NextResponse.json({ message: "API is working", method: "GET" })
}

export async function POST(request: NextRequest) {
  console.log("🔄 Update password API called")
  
  try {
    const body = await request.json()
    const { password } = body
    console.log("🔄 Request body parsed successfully, password length:", password?.length)

    if (!password) {
      console.log("❌ No password provided")
      return NextResponse.json(
        { success: false, error: "새 비밀번호가 필요합니다." },
        { status: 400 }
      )
    }

    // 비밀번호 유효성 검사
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      )
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { success: false, error: "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다." },
        { status: 400 }
      )
    }

    // Authorization 헤더에서 토큰 확인
    const authorization = request.headers.get('authorization')
    const accessToken = authorization?.replace('Bearer ', '')
    
    console.log("🔑 Update password API - access token:", accessToken ? "present" : "not present")

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "액세스 토큰이 필요합니다." },
        { status: 401 }
      )
    }

    // Service Role 클라이언트로 사용자 확인 및 업데이트
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 토큰으로 사용자 확인
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
    
    if (userError || !user) {
      console.error("❌ Token validation failed:", userError)
      return NextResponse.json(
        { success: false, error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      )
    }

    console.log("✅ User validated:", user.email)

    // Service Role로 비밀번호 업데이트
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    )

    if (updateError) {
      console.error("❌ Password update failed:", updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 400 }
      )
    }

    console.log("✅ Password updated successfully")
    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다."
    })

  } catch (error) {
    console.error("❌ Password update API error:", error)
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

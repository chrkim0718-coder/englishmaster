import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"
  const type = searchParams.get("type")

  console.log("🔍 Auth callback START")
  console.log("   - URL:", request.url)
  console.log("   - code:", code ? "present" : "not present")
  console.log("   - type:", type)
  console.log("   - next:", next)
  console.log("   - origin:", origin)

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log("🔑 Session exchange result:")
    console.log("   - error:", error)
    console.log("   - user email:", data.user?.email)
    console.log("   - session exists:", !!data.session)
    
    if (!error && data.session) {
      // 비밀번호 재설정인 경우 update-password 페이지로 리다이렉트
      if (type === "recovery") {
        console.log("🔄 Redirecting to update-password page")
        return NextResponse.redirect(`${origin}/auth/update-password`)
      }
      
      // 일반 로그인인 경우 next 또는 홈페이지로 리다이렉트
      console.log("🔄 Redirecting to home page")
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error("❌ Session exchange failed:", error)
    }
  } else {
    console.log("❌ No code parameter found in URL")
  }

  // 에러가 있는 경우 로그인 페이지로 리다이렉트
  console.log("🔄 Redirecting to login page due to error")
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}

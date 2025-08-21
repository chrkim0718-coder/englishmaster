import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Use service role key for admin operations
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    )

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: "이메일이 필요합니다" 
      }, { status: 400 })
    }

    // Get user by email
    const { data: userData, error: getUserError } = await supabase.auth.admin.listUsers()

    if (getUserError) {
      return NextResponse.json({ 
        success: false, 
        error: "사용자 조회 실패: " + getUserError.message 
      }, { status: 400 })
    }

    const user = userData.users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: "사용자를 찾을 수 없습니다" 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        confirmed_at: user.confirmed_at,
        created_at: user.created_at,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
        aud: user.aud,
        role: user.role
      }
    })

  } catch (error) {
    console.error("Debug user error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "서버 오류가 발생했습니다" 
    }, { status: 500 })
  }
}

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

    // Verify admin user with regular client
    const regularSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Check if current user is authenticated
    const { data: { user }, error: userError } = await regularSupabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "인증이 필요합니다" 
      }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: "사용자 ID가 필요합니다" 
      }, { status: 400 })
    }

    // Fix user authentication status
    const { error: fixError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        email_confirm: true,
        app_metadata: {
          provider: 'email',
          providers: ['email']
        },
        user_metadata: {
          created_by_admin: true,
          email_confirmed_at: new Date().toISOString(),
          login_enabled: true
        }
      }
    )

    if (fixError) {
      console.error("Fix user error:", fixError)
      return NextResponse.json({ 
        success: false, 
        error: "사용자 수정에 실패했습니다: " + fixError.message 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "사용자 로그인 상태가 수정되었습니다"
    })

  } catch (error) {
    console.error("Fix user error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "서버 오류가 발생했습니다" 
    }, { status: 500 })
  }
}

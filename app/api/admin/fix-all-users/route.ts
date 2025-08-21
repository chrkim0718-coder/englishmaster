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

    // Get all users with unconfirmed emails or login issues
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error("List users error:", listError)
      return NextResponse.json({ 
        success: false, 
        error: "사용자 목록 조회에 실패했습니다" 
      }, { status: 400 })
    }

    // Filter users who might have login issues (created by admin or with unconfirmed emails)
    const problematicUsers = authUsers.users.filter(u => 
      u.user_metadata?.created_by_admin || 
      !u.email_confirmed_at ||
      u.email !== 'admin@englishmaster.com' // Exclude admin user
    )

    let fixedCount = 0
    let errorCount = 0

    // Fix each user
    for (const user of problematicUsers) {
      try {
        const { error: fixError } = await supabase.auth.admin.updateUserById(
          user.id,
          { 
            email_confirm: true,
            app_metadata: {
              provider: 'email',
              providers: ['email']
            },
            user_metadata: {
              ...user.user_metadata,
              created_by_admin: true,
              email_confirmed_at: new Date().toISOString(),
              login_enabled: true
            }
          }
        )

        if (fixError) {
          console.error(`Fix user ${user.email} error:`, fixError)
          errorCount++
        } else {
          fixedCount++
        }
      } catch (error) {
        console.error(`Fix user ${user.email} error:`, error)
        errorCount++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${fixedCount}명의 사용자 로그인 상태를 수정했습니다${errorCount > 0 ? ` (${errorCount}명 실패)` : ''}`,
      fixedCount,
      errorCount
    })

  } catch (error) {
    console.error("Fix all users error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "서버 오류가 발생했습니다" 
    }, { status: 500 })
  }
}

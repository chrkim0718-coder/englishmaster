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

    const userResult = await regularSupabase.auth.getUser()
    const user = userResult?.data?.user
    const authError = userResult?.error

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, email, password, userId } = await request.json()

    switch (action) {
      case 'create':
        // Create new user with admin privileges
        const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            created_by_admin: true
          },
          app_metadata: {
            provider: 'email',
            providers: ['email']
          }
        })

        if (createError) {
          console.error("Create user error:", createError)
          return NextResponse.json({ 
            success: false, 
            error: "사용자 생성에 실패했습니다: " + createError.message 
          }, { status: 400 })
        }

        // Create user profile
        if (newUserData.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: newUserData.user.id,
              email: newUserData.user.email,
              created_at: new Date().toISOString()
            })

          if (profileError) {
            console.error("Create profile error:", profileError)
            // Try to delete the auth user if profile creation failed
            await supabase.auth.admin.deleteUser(newUserData.user.id)
            return NextResponse.json({ 
              success: false, 
              error: "프로필 생성에 실패했습니다" 
            }, { status: 400 })
          }

          // Confirm the user's email manually to ensure they can log in
          const { error: confirmError } = await supabase.auth.admin.updateUserById(
            newUserData.user.id,
            { 
              email_confirm: true,
              app_metadata: {
                provider: 'email',
                providers: ['email']
              },
              user_metadata: {
                ...newUserData.user.user_metadata,
                created_by_admin: true,
                email_confirmed_at: new Date().toISOString()
              }
            }
          )

          if (confirmError) {
            console.error("Email confirmation error:", confirmError)
            // Don't fail the creation, just log the error
          }
        }

        return NextResponse.json({ 
          success: true, 
          message: "사용자가 성공적으로 생성되었습니다",
          user: newUserData.user
        })

      case 'delete':
        // Delete user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

        if (deleteError) {
          console.error("Delete user error:", deleteError)
          return NextResponse.json({ 
            success: false, 
            error: "사용자 삭제에 실패했습니다: " + deleteError.message 
          }, { status: 400 })
        }

        // Delete user profile (should cascade automatically, but let's be explicit)
        await supabase
          .from('user_profiles')
          .delete()
          .eq('id', userId)

        return NextResponse.json({ 
          success: true, 
          message: "사용자가 성공적으로 삭제되었습니다" 
        })

      case 'reset_password':
        // Reset user password
        const { data: resetData, error: resetError } = await supabase.auth.admin.updateUserById(
          userId,
          { password }
        )

        if (resetError) {
          console.error("Reset password error:", resetError)
          return NextResponse.json({ 
            success: false, 
            error: "비밀번호 재설정에 실패했습니다: " + resetError.message 
          }, { status: 400 })
        }

        return NextResponse.json({ 
          success: true, 
          message: "비밀번호가 성공적으로 재설정되었습니다" 
        })

      case 'confirm_email':
        // Manually confirm user's email
        const { data: confirmData, error: confirmError } = await supabase.auth.admin.updateUserById(
          userId,
          { 
            email_confirm: true,
            app_metadata: {
              provider: 'email',
              providers: ['email']
            }
          }
        )

        if (confirmError) {
          console.error("Email confirmation error:", confirmError)
          return NextResponse.json({ 
            success: false, 
            error: "이메일 확인에 실패했습니다: " + confirmError.message 
          }, { status: 400 })
        }

        return NextResponse.json({ 
          success: true, 
          message: "이메일이 수동으로 확인되었습니다" 
        })

      default:
        return NextResponse.json({ 
          success: false, 
          error: "유효하지 않은 액션입니다" 
        }, { status: 400 })
    }

  } catch (error) {
    console.error("User management error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "서버 오류가 발생했습니다" 
    }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
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
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create service role client to get auth user details
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get all users from auth with their email confirmation status
    const { data: authUsers, error: authUsersError } = await serviceSupabase.auth.admin.listUsers()

    if (authUsersError) {
      console.error("Auth users fetch error:", authUsersError)
      return NextResponse.json({ error: "Failed to fetch auth users" }, { status: 500 })
    }

    console.log(`📊 Found ${authUsers.users.length} auth users`)

    // Get all users with their stats from user_profiles
    const { data: profileUsers, error: usersError } = await supabase
      .from("user_profiles")
      .select(`
        *,
        quiz_sessions(count)
      `)
      .order("created_at", { ascending: false })

    if (usersError) {
      console.error("Users fetch error:", usersError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    console.log(`📊 Found ${profileUsers?.length || 0} profile users`)

    // Create a comprehensive list including auth users without profiles
    const allUserIds = new Set([
      ...authUsers.users.map(u => u.id),
      ...(profileUsers || []).map(u => u.id)
    ])

    // Get detailed stats for each user and merge with auth data
    const usersWithStats = await Promise.all(
      Array.from(allUserIds).map(async (userId) => {
        // Find auth user
        const authUser = authUsers.users.find(au => au.id === userId)
        // Find profile user
        const profileUser = profileUsers?.find(pu => pu.id === userId)

        if (!authUser) {
          // Skip if auth user doesn't exist (shouldn't happen)
          return null
        }

        const { data: sessions } = await supabase
          .from("quiz_sessions")
          .select("score_percentage, completed_at")
          .eq("user_id", userId)

        const totalSessions = sessions?.length || 0
        const averageScore =
          totalSessions > 0 && sessions ? Math.round(sessions.reduce((sum, s) => sum + s.score_percentage, 0) / totalSessions) : 0
        const lastActivity = sessions?.[0]?.completed_at || authUser.created_at

        return {
          id: userId,
          email: authUser.email || 'Unknown',
          full_name: profileUser?.full_name || '',
          created_at: profileUser?.created_at || authUser.created_at,
          totalSessions,
          averageScore,
          lastActivity,
          emailConfirmed: !!authUser?.email_confirmed_at,
          emailConfirmedAt: authUser?.email_confirmed_at,
        }
      }),
    )

    // Filter out null entries and sort by creation date
    const validUsers = usersWithStats
      .filter(user => user !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log(`✅ Returning ${validUsers.length} total users`)

    return NextResponse.json({
      success: true,
      users: validUsers,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

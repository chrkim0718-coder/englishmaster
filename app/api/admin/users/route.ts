import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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

    // Get all users with their stats
    const { data: users, error: usersError } = await supabase
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

    // Get detailed stats for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        const { data: sessions } = await supabase
          .from("quiz_sessions")
          .select("score_percentage, completed_at")
          .eq("user_id", user.id)

        const totalSessions = sessions?.length || 0
        const averageScore =
          totalSessions > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.score_percentage, 0) / totalSessions) : 0
        const lastActivity = sessions?.[0]?.completed_at || user.created_at

        return {
          ...user,
          totalSessions,
          averageScore,
          lastActivity,
        }
      }),
    )

    return NextResponse.json({
      success: true,
      users: usersWithStats,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { createApiClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔍 Debugging performance data for user:", user.id)

    // Check quiz sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(10)

    console.log("📊 Quiz sessions found:", sessions?.length || 0)
    if (sessions) {
      console.log("📋 Sample sessions:", sessions.slice(0, 3))
    }

    // Check user answers
    const { data: answers, error: answersError } = await supabase
      .from("user_answers")
      .select("*")
      .eq("user_id", user.id)
      .order("answered_at", { ascending: false })
      .limit(10)

    console.log("📝 User answers found:", answers?.length || 0)
    if (answers) {
      console.log("📋 Sample answers:", answers.slice(0, 3))
    }

    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    console.log("👤 User profile:", profile)

    // Get all tables that might contain user data
    const { data: allSessions, error: allSessionsError } = await supabase
      .from("quiz_sessions")
      .select("user_id, grammar_type, difficulty_level, created_at")
      .limit(5)

    console.log("🗂️ Sample of all sessions in database:", allSessions)

    return NextResponse.json({
      success: true,
      debug: {
        userId: user.id,
        userEmail: user.email,
        sessions: {
          count: sessions?.length || 0,
          data: sessions?.slice(0, 3) || [],
          error: sessionsError?.message
        },
        answers: {
          count: answers?.length || 0,
          data: answers?.slice(0, 3) || [],
          error: answersError?.message
        },
        profile: {
          data: profile,
          error: profileError?.message
        },
        allSessions: {
          data: allSessions?.slice(0, 5) || [],
          error: allSessionsError?.message
        }
      }
    })

  } catch (error) {
    console.error("Debug API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Debug failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

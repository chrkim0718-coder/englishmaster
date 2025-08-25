import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

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
  
    const userResult = await supabase.auth.getUser()
    const user = userResult?.data?.user
    const authError = userResult?.error

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })

    if (usersError) {
      console.error("Users count error:", usersError)
    }

    // Get total questions
    const { count: totalQuestions, error: questionsError } = await supabase
      .from("grammar_questions")
      .select("*", { count: "exact", head: true })

    if (questionsError) {
      console.error("Questions count error:", questionsError)
    }

    // Get total quiz sessions
    const { count: totalSessions, error: sessionsError } = await supabase
      .from("quiz_sessions")
      .select("*", { count: "exact", head: true })

    if (sessionsError) {
      console.error("Sessions count error:", sessionsError)
    }

    // Get questions by grammar type
    const { data: questionsByType, error: typeError } = await supabase.from("grammar_questions").select("grammar_type")

    const grammarTypeStats =
      questionsByType?.reduce((acc: any, q) => {
        acc[q.grammar_type] = (acc[q.grammar_type] || 0) + 1
        return acc
      }, {}) || {}

    // Get questions by grammar type and difficulty for detailed breakdown
    const { data: questionsDetailed, error: detailedError } = await supabase
      .from("grammar_questions")
      .select("grammar_type, difficulty_level")

    const grammarTypeDetailedStats: any = {}
    if (questionsDetailed) {
      questionsDetailed.forEach((q) => {
        if (!grammarTypeDetailedStats[q.grammar_type]) {
          grammarTypeDetailedStats[q.grammar_type] = {
            total: 0,
            beginner: 0,
            intermediate: 0,
            advanced: 0
          }
        }
        grammarTypeDetailedStats[q.grammar_type].total++
        if (q.difficulty_level === 'beginner' || q.difficulty_level === '초급') {
          grammarTypeDetailedStats[q.grammar_type].beginner++
        } else if (q.difficulty_level === 'intermediate' || q.difficulty_level === '중급') {
          grammarTypeDetailedStats[q.grammar_type].intermediate++
        } else if (q.difficulty_level === 'advanced' || q.difficulty_level === '고급') {
          grammarTypeDetailedStats[q.grammar_type].advanced++
        }
      })
      // 로그 추가: 각 문법유형별 난이도별 개수 출력
      console.log('문법유형별 난이도별 개수 (grammarTypeDetailedStats):')
      Object.entries(grammarTypeDetailedStats).forEach(([type, detail]) => {
        console.log(`- ${type}:`, detail)
      })
    }

    // Get questions by difficulty
    const { data: questionsByDifficulty, error: difficultyError } = await supabase
      .from("grammar_questions")
      .select("difficulty_level")

    const difficultyStats =
      questionsByDifficulty?.reduce((acc: any, q) => {
        acc[q.difficulty_level] = (acc[q.difficulty_level] || 0) + 1
        return acc
      }, {}) || {}

    // Get recent activity (last 10 quiz sessions)
    const { data: recentActivity, error: activityError } = await supabase
      .from("quiz_sessions")
      .select(`
        *,
        user_profiles!inner(email)
      `)
      .order("completed_at", { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalQuestions: totalQuestions || 0,
        totalSessions: totalSessions || 0,
        grammarTypeStats,
        grammarTypeDetailedStats,
        difficultyStats,
        recentActivity: recentActivity || [],
      },
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch admin statistics" }, { status: 500 })
  }
}

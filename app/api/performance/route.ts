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

    // Get overall stats
    const { data: sessions, error: sessionsError } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })

    if (sessionsError) {
      console.error("Sessions fetch error:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
    }

    // Calculate overall statistics
    const totalQuizzes = sessions.length
    const totalQuestions = sessions.reduce((sum, session) => sum + session.total_questions, 0)
    const totalCorrect = sessions.reduce((sum, session) => sum + session.correct_answers, 0)
    const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

    // Get performance by grammar type
    const grammarTypeStats = sessions.reduce((acc: any, session) => {
      const type = session.grammar_type
      if (!acc[type]) {
        acc[type] = {
          grammar_type: type,
          total_quizzes: 0,
          total_questions: 0,
          correct_answers: 0,
          average_score: 0,
        }
      }
      acc[type].total_quizzes += 1
      acc[type].total_questions += session.total_questions
      acc[type].correct_answers += session.correct_answers
      acc[type].average_score = Math.round((acc[type].correct_answers / acc[type].total_questions) * 100)
      return acc
    }, {})

    // Get performance by difficulty
    const difficultyStats = sessions.reduce((acc: any, session) => {
      const difficulty = session.difficulty_level
      if (!acc[difficulty]) {
        acc[difficulty] = {
          difficulty_level: difficulty,
          total_quizzes: 0,
          total_questions: 0,
          correct_answers: 0,
          average_score: 0,
        }
      }
      acc[difficulty].total_quizzes += 1
      acc[difficulty].total_questions += session.total_questions
      acc[difficulty].correct_answers += session.correct_answers
      acc[difficulty].average_score = Math.round(
        (acc[difficulty].correct_answers / acc[difficulty].total_questions) * 100,
      )
      return acc
    }, {})

    // Get weak areas (grammar types with lowest scores)
    const weakAreas = Object.values(grammarTypeStats)
      .sort((a: any, b: any) => a.average_score - b.average_score)
      .slice(0, 3)

    // Get recent progress (last 10 sessions)
    const recentProgress = sessions.slice(0, 10).map((session) => ({
      date: session.completed_at,
      score: session.score_percentage,
      grammar_type: session.grammar_type,
      difficulty: session.difficulty_level,
    }))

    return NextResponse.json({
      success: true,
      stats: {
        totalQuizzes,
        totalQuestions,
        averageScore,
        grammarTypeStats: Object.values(grammarTypeStats),
        difficultyStats: Object.values(difficultyStats),
        weakAreas,
        recentProgress,
      },
    })
  } catch (error) {
    console.error("Error fetching performance data:", error)
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
  }
}

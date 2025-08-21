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

    const url = new URL(request.url)
    const grammarType = url.searchParams.get('grammarType')

    if (!grammarType) {
      return NextResponse.json({ error: "Grammar type is required" }, { status: 400 })
    }

    // 한글-영어 문법 유형 매핑
    const grammarTypeMapping: Record<string, string> = {
      "현재시제": "Present Simple",
      "현재완료": "Present Perfect", 
      "과거시제": "Past Simple",
      "과거완료": "Past Perfect",
      "미래시제": "Future Tense",
      "가정법": "Conditionals",
      "수동태": "Passive Voice",
      "조동사": "Modal Verbs",
      "동명사/부정사": "Gerunds and Infinitives",
      "동명사": "Gerunds",
      "부정사": "Infinitives",
      "분사": "Participles",
      "관사": "Articles",
      "전치사": "Prepositions",
      "관계사": "Relative Clauses",
      "접속사": "Conjunctions",
      "시제": "Tenses",
    }

    // 영어-한글 매핑 (역방향)
    const englishToKorean: Record<string, string> = {}
    Object.entries(grammarTypeMapping).forEach(([korean, english]) => {
      englishToKorean[english] = korean
    })

    // 한글 문법유형을 영어로 변환 (데이터베이스 조회용)
    const englishGrammarType = grammarTypeMapping[grammarType] || grammarType
    
    console.log(`🔍 Searching for grammar type: ${grammarType} (Korean) or ${englishGrammarType} (English)`)

    // Get quiz sessions for specific grammar type (try both Korean and English)
    const { data: sessions, error: sessionsError } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("user_id", user.id)
      .or(`grammar_type.eq.${grammarType},grammar_type.eq.${englishGrammarType}`)
      .order("completed_at", { ascending: true })

    if (sessionsError) {
      console.error("Sessions fetch error:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch grammar type data" }, { status: 500 })
    }

    console.log(`📊 Found ${sessions?.length || 0} sessions for ${grammarType}`)

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        success: true,
        grammarType,
        chartData: [],
        overallStats: {
          totalSessions: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          averageAccuracy: 0,
          recentSessions: 0,
          recentAccuracy: 0
        }
      })
    }

    // Process data by date
    const dailyStats = sessions.reduce((acc: any, session) => {
      const date = new Date(session.completed_at).toLocaleDateString('ko-KR')
      
      if (!acc[date]) {
        acc[date] = {
          date,
          totalQuestions: 0,
          correctAnswers: 0,
          totalSessions: 0,
          scores: []
        }
      }
      
      acc[date].totalQuestions += session.total_questions
      acc[date].correctAnswers += session.correct_answers
      acc[date].totalSessions += 1
      acc[date].scores.push(session.score_percentage)
      
      return acc
    }, {})

    // Convert to array and calculate averages
    const chartData = Object.values(dailyStats).map((day: any) => ({
      date: day.date,
      totalQuestions: day.totalQuestions,
      correctAnswers: day.correctAnswers,
      totalSessions: day.totalSessions,
      accuracyRate: Math.round((day.correctAnswers / day.totalQuestions) * 100),
      averageScore: Math.round(day.scores.reduce((sum: number, score: number) => sum + score, 0) / day.scores.length)
    }))

    // Get recent performance trends (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentSessions = sessions.filter(session => 
      new Date(session.completed_at) >= thirtyDaysAgo
    )

    const overallStats = {
      totalSessions: sessions.length,
      totalQuestions: sessions.reduce((sum, s) => sum + s.total_questions, 0),
      totalCorrect: sessions.reduce((sum, s) => sum + s.correct_answers, 0),
      averageAccuracy: sessions.length > 0 
        ? Math.round((sessions.reduce((sum, s) => sum + s.correct_answers, 0) / 
                     sessions.reduce((sum, s) => sum + s.total_questions, 0)) * 100) 
        : 0,
      recentSessions: recentSessions.length,
      recentAccuracy: recentSessions.length > 0 
        ? Math.round((recentSessions.reduce((sum, s) => sum + s.correct_answers, 0) / 
                     recentSessions.reduce((sum, s) => sum + s.total_questions, 0)) * 100)
        : 0
    }

    return NextResponse.json({
      success: true,
      grammarType,
      chartData,
      overallStats
    })

  } catch (error) {
    console.error("Performance chart API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

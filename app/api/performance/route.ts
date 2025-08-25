import { type NextRequest, NextResponse } from "next/server"
import { createApiClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Get overall stats
    const { data: sessions, error: sessionsError } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })

    console.log(`📊 Current user ID: ${user.id}`)
    console.log(`📊 Current user email: ${user.email}`)

    if (sessionsError) {
      console.error("Sessions fetch error:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
    }

    // Try to get user_answers data, but don't fail if it's empty
    const { data: userAnswers, error: answersError } = await supabase
      .from("user_answers")
      .select("*")
      .eq("user_id", user.id)

    console.log(`📊 Found ${sessions?.length || 0} sessions and ${userAnswers?.length || 0} individual answers`)

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        hasData: false,
        stats: {
          totalQuizzes: 0,
          totalQuestions: 0,
          averageScore: 0,
          weakAreas: [],
          grammarTypeStats: [],
          difficultyStats: [],
          recentProgress: []
        }
      })
    }

    // 디버깅: 세션 데이터의 문법 유형 확인
    console.log("📋 Session grammar types:", sessions.map((s: any) => s.grammar_type).slice(0, 5))
    console.log("📊 Session difficulty levels:", sessions.map((s: any) => s.difficulty_level).slice(0, 5))
    console.log("📝 Session details:", sessions.map((s: any) => ({ 
      id: s.id, 
      difficulty: s.difficulty_level, 
      grammar: s.grammar_type,
      user_id: s.user_id 
    })).slice(0, 3))

    // Calculate overall statistics
    const totalQuizzes = sessions.length
    const totalQuestions = sessions.reduce((sum: number, session: any) => sum + session.total_questions, 0)
    const totalCorrect = sessions.reduce((sum: number, session: any) => sum + session.correct_answers, 0)
    const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

    // Get performance by grammar type
    const grammarTypeStats = sessions.reduce((acc: any, session: any) => {
      const type = session.grammar_type
      // 영어 문법 유형을 한글로 변환하여 표시
      const koreanType = englishToKorean[type] || type
      // 원본 영어 타입 결정 (이미 한글이면 영어로 변환, 영어면 그대로 사용)
      const originalType = grammarTypeMapping[type] || type
      
      console.log(`🔄 Processing: ${type} -> Korean: ${koreanType}, Original: ${originalType}`)
      
      if (!acc[koreanType]) {
        acc[koreanType] = {
          grammar_type: koreanType,
          original_type: originalType, // 원본 영어 타입도 저장
          total_quizzes: 0,
          total_questions: 0,
          correct_answers: 0,
          average_score: 0,
        }
      }
      acc[koreanType].total_quizzes += 1
      acc[koreanType].total_questions += session.total_questions
      acc[koreanType].correct_answers += session.correct_answers
      acc[koreanType].average_score = Math.round((acc[koreanType].correct_answers / acc[koreanType].total_questions) * 100)
      return acc
    }, {})

    // Get performance by difficulty
    const difficultyStats = sessions.reduce((acc: any, session: any) => {
      const difficulty = session.difficulty_level || "기타"
      console.log(`🎯 Processing session: difficulty=${difficulty}, grammar=${session.grammar_type}`)
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

    console.log("🎯 Final difficulty stats:", Object.keys(difficultyStats))

    // Get weak areas (grammar types with lowest scores AND actual incorrect answers)
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

    // Get user's current incorrect answers
    const { data: currentUserAnswers } = await serviceSupabase
      .from("user_answers")
      .select("question_id, is_correct, answered_at")
      .eq("user_id", user.id)
      .order("answered_at", { ascending: false })

    // Get latest result for each question
    const latestResultsByQuestion = new Map()
    if (currentUserAnswers) {
      currentUserAnswers.forEach((answer: any) => {
        const questionId = answer.question_id
        if (!latestResultsByQuestion.has(questionId)) {
          latestResultsByQuestion.set(questionId, answer)
        }
      })
    }

    // Get currently incorrect question IDs
    const currentlyIncorrectQuestions = Array.from(latestResultsByQuestion.values())
      .filter((answer: any) => !answer.is_correct)
      .map((answer: any) => answer.question_id)

    // Get grammar types for incorrect questions
    const incorrectQuestionGrammarTypes = new Set()
    if (currentlyIncorrectQuestions.length > 0) {
      const { data: incorrectQuestions } = await serviceSupabase
        .from("grammar_questions")
        .select("grammar_type")
        .in("id", currentlyIncorrectQuestions)

      if (incorrectQuestions) {
        incorrectQuestions.forEach((q: any) => {
          const koreanType = englishToKorean[q.grammar_type] || q.grammar_type
          incorrectQuestionGrammarTypes.add(koreanType)
        })
      }
    }


    // user_answers 기반으로 취약 유형 집계 (틀린 문제의 grammar_type별로 개수/정답률 등 계산)
    let weakAreas: any[] = [];
    if (currentlyIncorrectQuestions.length > 0) {
      // grammar_questions에서 틀린 문제의 grammar_type, id, 등 추가 정보 조회
      const { data: incorrectQuestions } = await serviceSupabase
        .from("grammar_questions")
        .select("id, grammar_type, question_text")
        .in("id", currentlyIncorrectQuestions);

      // 한글 매핑
      const englishToKorean: Record<string, string> = {
        "Present Simple": "현재시제",
        "Present Perfect": "현재완료",
        "Past Simple": "과거시제",
        "Past Perfect": "과거완료",
        "Future Tense": "미래시제",
        "Conditionals": "가정법",
        "Passive Voice": "수동태",
        "Modal Verbs": "조동사",
        "Gerunds and Infinitives": "동명사/부정사",
        "Gerunds": "동명사",
        "Infinitives": "부정사",
        "Participles": "분사",
        "Articles": "관사",
        "Prepositions": "전치사",
        "Relative Clauses": "관계사",
        "Conjunctions": "접속사",
        "Tenses": "시제",
      };

      // grammar_type별로 그룹핑 및 개수 집계
      const weakMap: Record<string, { grammar_type: string, total_questions: number, average_score: number }> = {};
      for (const q of incorrectQuestions || []) {
        const koType = englishToKorean[q.grammar_type] || q.grammar_type;
        if (!weakMap[koType]) {
          weakMap[koType] = { grammar_type: koType, total_questions: 1, average_score: 0 };
        } else {
          weakMap[koType].total_questions += 1;
        }
      }
      // 평균 점수는 0(틀린 문제만 집계)로 표시
      weakAreas = Object.values(weakMap);
    }

    // Get recent progress (last 10 sessions) with Korean grammar type names
    const recentProgress = sessions.slice(0, 10).map((session: any) => {
      const koreanGrammarType = englishToKorean[session.grammar_type] || session.grammar_type
      return {
        date: session.completed_at,
        score: session.score_percentage,
        grammar_type: koreanGrammarType,
        difficulty: session.difficulty_level || "기타",
      }
    })

    return NextResponse.json({
      success: true,
      hasData: true,
      stats: {
        totalQuizzes,
        totalQuestions,
        averageScore,
        grammarTypeStats: Object.values(grammarTypeStats),
        difficultyStats: Object.values(difficultyStats),
        weakAreas: weakAreas,
        recentProgress,
      },
    })
  } catch (error) {
    console.error("Error fetching performance data:", error)
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
  }
}

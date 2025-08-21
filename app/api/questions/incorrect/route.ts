import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create service role client for user_answers access
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { searchParams } = new URL(request.url)
    const grammarType = searchParams.get("grammarType")
    // 틀린 문제는 모든 문제를 가져오도록 기본값을 크게 설정
    const limit = parseInt(searchParams.get("limit") || "100")
    const userId = searchParams.get("userId")

    if (!grammarType) {
      return NextResponse.json({ error: "Grammar type is required" }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 Fetching incorrect questions for user ${user.id}, grammar type: ${grammarType}`)

    // 문법 유형 매핑 - 한글 -> 영어 변환
    const grammarTypeMapping: Record<string, string> = {
      "관계사": "Relative Clauses",
      "접속사": "Conjunctions", 
      "전치사": "Prepositions",
      "시제": "Tenses",
      "가정법": "Conditionals",
      "수동태": "Passive Voice",
      "조동사": "Modal Verbs",
      "동명사": "Gerunds",
      "부정사": "Infinitives",
      "분사": "Participles",
      "현재시제": "Present Simple",
      "과거시제": "Past Simple",
      "현재완료": "Present Perfect",
      "과거완료": "Past Perfect",
      "미래시제": "Future Tense",
      "관사": "Articles"
    }

    // 한글로 온 경우 영어로 변환, 아니면 그대로 사용
    const englishGrammarType = grammarTypeMapping[grammarType] || grammarType
    console.log(`📝 Mapped grammar type: ${grammarType} -> ${englishGrammarType}`)

    // user_answers 테이블에서 사용자의 답변 조회 (service role 사용)
    const { data: allUserAnswers, error: answersError } = await serviceSupabase
      .from("user_answers")
      .select("question_id, is_correct, answered_at")
      .eq("user_id", user.id)
      .order("answered_at", { ascending: false })

    if (answersError) {
      console.error("Error fetching user answers:", answersError)
      return NextResponse.json({ error: "Failed to fetch user answers" }, { status: 500 })
    }

    console.log(`📊 Total answers for user: ${allUserAnswers?.length || 0}`)
    
    if (!allUserAnswers || allUserAnswers.length === 0) {
      console.log("No answers found for user")
      return NextResponse.json({ 
        success: true, 
        questions: [],
        message: "No quiz history found"
      })
    }
    // 각 문제별로 가장 최근 결과만 유지 (Map을 사용하여 최신 결과로 덮어쓰기)
    const latestResultsByQuestion = new Map()
    
    allUserAnswers.forEach((answer: any) => {
      const questionId = answer.question_id
      if (!latestResultsByQuestion.has(questionId)) {
        latestResultsByQuestion.set(questionId, answer)
      }
    })

    // 가장 최근에 틀린 문제들만 필터링
    const currentlyIncorrectQuestions = Array.from(latestResultsByQuestion.values())
      .filter((answer: any) => !answer.is_correct)
      .map((answer: any) => answer.question_id)

    console.log(`🎯 Currently incorrect questions (latest attempts only): ${currentlyIncorrectQuestions.length}`)
    
    // 현재 틀린 문제들의 문법 유형을 확인하기 위해 실제 문제 데이터를 가져와서 로깅
    if (currentlyIncorrectQuestions.length > 0) {
      const { data: incorrectQuestionsDetails } = await supabase
        .from("grammar_questions")
        .select("id, grammar_type, question_text")
        .in("id", currentlyIncorrectQuestions)
      
      console.log("🔍 Currently incorrect questions details:", incorrectQuestionsDetails)
    }

    if (currentlyIncorrectQuestions.length === 0) {
      console.log("No currently incorrect answers found")
      return NextResponse.json({ 
        success: true, 
        questions: [],
        message: "축하합니다! 모든 문제를 맞히셨습니다."
      })
    }

    // 해당 문법 유형의 틀린 문제들 가져오기
    // 먼저 해당 문법 유형의 모든 문제 ID를 가져오고, 그 중에서 틀린 것들만 필터링
    const { data: grammarTypeQuestions, error: grammarQuestionsError } = await supabase
      .from("grammar_questions")
      .select("id")
      .eq("grammar_type", englishGrammarType)

    if (grammarQuestionsError) {
      console.error("Error fetching grammar type questions:", grammarQuestionsError)
      return NextResponse.json({ error: "Failed to fetch grammar type questions" }, { status: 500 })
    }

    const grammarQuestionIds = grammarTypeQuestions?.map((q: any) => q.id) || []
    console.log(`🔍 Found ${grammarQuestionIds.length} questions for grammar type ${englishGrammarType}`)

    // 이제 틀린 문제들 중에서 해당 문법 유형에 속하는 것들만 필터링
    // 타입을 맞춰서 비교 (모두 string으로 변환)
    const relevantIncorrectQuestions = currentlyIncorrectQuestions.filter((id: any) => 
      grammarQuestionIds.some((grammarId: any) => grammarId?.toString() === id?.toString())
    )
    console.log(`🎯 Found ${relevantIncorrectQuestions.length} currently incorrect questions for this grammar type`)

    if (relevantIncorrectQuestions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        questions: [],
        message: "이 문법 유형에서 현재 틀린 문제가 없습니다! 🎉"
      })
    }

    // 실제 문제 데이터 가져오기
    let query = supabase
      .from("grammar_questions")
      .select("*")
      .in("id", relevantIncorrectQuestions)
      .limit(limit)

    const { data: questions, error: questionsError } = await query

    if (questionsError) {
      console.error("Error fetching questions:", questionsError)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    console.log(`✅ Found ${questions?.length || 0} incorrect questions for grammar type ${englishGrammarType}`)

    // 문제 순서를 랜덤하게 섞기
    const shuffledQuestions = questions ? [...questions].sort(() => Math.random() - 0.5) : []

    return NextResponse.json({
      success: true,
      questions: shuffledQuestions,
      total: shuffledQuestions.length
    })

  } catch (error) {
    console.error("Unexpected error in /api/questions/incorrect:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

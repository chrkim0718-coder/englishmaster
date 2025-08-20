import { type NextRequest, NextResponse } from "next/server"
import { createApiClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { grammarType, difficultyLevel, questions, answers, score } = await request.json()

    const supabase = await createApiClient()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure user profile exists
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert({ id: user.id, email: user.email }, { onConflict: "id" })

    if (profileError) {
      console.error("Profile upsert error:", profileError)
    }

    // Save quiz session
    const { data: sessionData, error: sessionError } = await supabase
      .from("quiz_sessions")
      .insert({
        user_id: user.id,
        grammar_type: grammarType,
        difficulty_level: difficultyLevel,
        total_questions: questions.length,
        correct_answers: score.correct,
        score_percentage: score.percentage,
        session_data: {
          questions,
          answers,
          timestamp: new Date().toISOString(),
        },
      })
      .select()

    if (sessionError) {
      console.error("Session save error:", sessionError)
      return NextResponse.json({ error: "Failed to save quiz results" }, { status: 500 })
    }

    // Save individual question results
    if (sessionData && sessionData[0]) {
      const questionResults = questions.map((question: any, index: number) => ({
        session_id: sessionData[0].id,
        question_id: question.id,
        user_answer: answers[index],
        is_correct: answers[index] === question.correct_answer,
        question_data: question,
      }))

      const { error: resultsError } = await supabase
        .from("quiz_question_results")
        .insert(questionResults)

      if (resultsError) {
        console.error("Question results save error:", resultsError)
        // Don't fail the request if question results fail to save
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionData?.[0]?.id,
      message: "Quiz results saved successfully",
    })
  } catch (error) {
    console.error("Error saving quiz results:", error)
    return NextResponse.json({ error: "Failed to save quiz results" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const { data, error } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching quiz results:", error)
      return NextResponse.json({ error: "Failed to fetch quiz results" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      results: data || [],
    })
  } catch (error) {
    console.error("Error in quiz results API:", error)
    return NextResponse.json({ error: "Failed to fetch quiz results" }, { status: 500 })
  }
}

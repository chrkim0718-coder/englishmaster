import { type NextRequest, NextResponse } from "next/server"
import { createApiClient } from "@/lib/supabase/server"
import { GRAMMAR_TYPE_MAPPING, DIFFICULTY_MAPPING } from "@/lib/ai/types"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grammarType = searchParams.get("grammarType")
    const difficultyLevel = searchParams.get("difficultyLevel")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const countOnly = searchParams.get("count") === "true"

    console.log('🔍 API: Received params:', { grammarType, difficultyLevel, limit, countOnly })

    const supabase = await createApiClient()
    
    // Get user from session to ensure authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // count만 요청하는 경우
    if (countOnly) {
      let countQuery = supabase.from("grammar_questions").select("*", { count: "exact", head: true })
      
      // Apply filters if provided
      if (grammarType) {
        const englishGrammarType = GRAMMAR_TYPE_MAPPING[grammarType] || grammarType
        countQuery = countQuery.eq("grammar_type", englishGrammarType)
      }
      if (difficultyLevel) {
        const englishDifficulty = DIFFICULTY_MAPPING[difficultyLevel] || difficultyLevel
        countQuery = countQuery.eq("difficulty_level", englishDifficulty)
      }

      const { count, error: countError } = await countQuery

      if (countError) {
        console.error("❌ Count error:", countError)
        return NextResponse.json({ error: "Failed to count questions" }, { status: 500 })
      }

      console.log('✅ Total questions count:', count)
      return NextResponse.json({
        success: true,
        count: count || 0,
      })
    }
    
    let query = supabase.from("grammar_questions").select("*").limit(limit).order("created_at", { ascending: false })

    // Apply filters if provided
    if (grammarType) {
      // 한국어 문법유형을 영어로 변환
      const englishGrammarType = GRAMMAR_TYPE_MAPPING[grammarType] || grammarType
      console.log('🔄 Mapping grammar type:', grammarType, '→', englishGrammarType)
      query = query.eq("grammar_type", englishGrammarType)
    }
    if (difficultyLevel) {
      // 한국어 난이도를 영어로 변환
      const englishDifficulty = DIFFICULTY_MAPPING[difficultyLevel] || difficultyLevel
      console.log('🔄 Mapping difficulty:', difficultyLevel, '→', englishDifficulty)
      query = query.eq("difficulty_level", englishDifficulty)
    }

    const { data, error } = await query

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    console.log('✅ Found questions:', data?.length || 0)

    return NextResponse.json({
      success: true,
      questions: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error("❌ Error in questions API:", error)
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}

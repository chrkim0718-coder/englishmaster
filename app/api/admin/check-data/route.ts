import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Use service role key for admin operations
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // Verify admin user with regular client
    const regularSupabase = createServerClient(
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

    // Check if current user is authenticated
    const { data: { user }, error: userError } = await regularSupabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "인증이 필요합니다" 
      }, { status: 401 })
    }

    // Get all quiz sessions to check data
    const { data: sessions, error: sessionsError } = await supabase
      .from("quiz_sessions")
      .select("*")
      .order("completed_at", { ascending: false })

    if (sessionsError) {
      console.error("Sessions fetch error:", sessionsError)
      return NextResponse.json({ 
        success: false, 
        error: "세션 데이터 조회에 실패했습니다" 
      }, { status: 400 })
    }

    // Analyze the data
    const englishGrammarTypes = [
      "Present Simple", "Present Perfect", "Past Simple", "Past Perfect",
      "Future Tense", "Conditionals", "Passive Voice", "Modal Verbs",
      "Gerunds and Infinitives", "Gerunds", "Infinitives", "Participles",
      "Articles", "Prepositions", "Relative Clauses", "Conjunctions", "Tenses"
    ]
    
    const analysis = {
      totalSessions: sessions?.length || 0,
      grammarTypes: [...new Set(sessions?.map(s => s.grammar_type) || [])],
      difficultyLevels: [...new Set(sessions?.map(s => s.difficulty_level) || [])],
      sessionsWithoutDifficulty: sessions?.filter(s => 
        !s.difficulty_level || 
        s.difficulty_level === null || 
        s.difficulty_level === ''
      ) || [],
      sessionsWithDifficulty: sessions?.filter(s => 
        s.difficulty_level && 
        s.difficulty_level !== null && 
        s.difficulty_level !== ''
      ) || [],
      sessionsWithEnglishGrammar: sessions?.filter(s => 
        s.grammar_type && englishGrammarTypes.includes(s.grammar_type)
      ) || [],
      sessionsWithKoreanGrammar: sessions?.filter(s => 
        s.grammar_type && !englishGrammarTypes.includes(s.grammar_type)
      ) || [],
      sampleSessions: sessions?.slice(0, 5) || []
    }

    console.log(`📊 Check data analysis:`)
    console.log(`- Total sessions: ${analysis.totalSessions}`)
    console.log(`- With difficulty: ${analysis.sessionsWithDifficulty.length}`)
    console.log(`- Without difficulty: ${analysis.sessionsWithoutDifficulty.length}`)
    console.log(`- English grammar types: ${analysis.sessionsWithEnglishGrammar.length}`)
    console.log(`- Korean grammar types: ${analysis.sessionsWithKoreanGrammar.length}`)
    console.log(`- Sample without difficulty:`, analysis.sessionsWithoutDifficulty.slice(0, 3).map(s => ({ id: s.id, difficulty: s.difficulty_level })))
    console.log(`- Sample English grammar:`, analysis.sessionsWithEnglishGrammar.slice(0, 3).map(s => ({ id: s.id, grammar: s.grammar_type })))

    return NextResponse.json({ 
      success: true, 
      analysis,
      sessions: sessions?.slice(0, 20) || [] // 최근 20개만 반환
    })

  } catch (error) {
    console.error("Check data error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "서버 오류가 발생했습니다" 
    }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { createApiClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grammarType = searchParams.get("grammarType")
    const difficultyLevel = searchParams.get("difficultyLevel")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const supabase = await createApiClient()
    
    // Get user from session to ensure authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    let query = supabase.from("grammar_questions").select("*").limit(limit).order("created_at", { ascending: false })

    // Apply filters if provided
    if (grammarType) {
      query = query.eq("grammar_type", grammarType)
    }
    if (difficultyLevel) {
      query = query.eq("difficulty_level", difficultyLevel)
    }

    const { data, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      questions: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error("Error in questions API:", error)
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}

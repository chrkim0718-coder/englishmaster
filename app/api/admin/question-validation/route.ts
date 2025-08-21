import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

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

    const { searchParams } = new URL(request.url)
    const grammarType = searchParams.get("grammarType")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const validationStatus = searchParams.get("validationStatus") || "pending"

    let query = supabase
      .from("grammar_questions")
      .select("*", { count: "exact" })
      .eq("validation_status", validationStatus)
      .order("created_at", { ascending: false })

    if (grammarType && grammarType !== "all") {
      query = query.eq("grammar_type", grammarType)
    }

    const offset = (page - 1) * limit
    const { data: questions, error, count } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching questions for validation:", error)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    // Get grammar types with pending validation counts
    const { data: grammarTypes, error: grammarTypesError } = await supabase
      .from("grammar_questions")
      .select("grammar_type, validation_status")
      .eq("validation_status", "pending")

    if (grammarTypesError) {
      console.error("Error fetching grammar types:", grammarTypesError)
    }

    const grammarTypeCounts = grammarTypes?.reduce((acc: Record<string, number>, item: any) => {
      acc[item.grammar_type] = (acc[item.grammar_type] || 0) + 1
      return acc
    }, {}) || {}

    // Get detailed counts by grammar type and difficulty level
    const { data: detailedCounts, error: detailedError } = await supabase
      .from("grammar_questions")
      .select("grammar_type, difficulty_level")
      .eq("validation_status", "pending")

    if (detailedError) {
      console.error("Error fetching detailed counts:", detailedError)
    }

    const grammarTypeDetails = detailedCounts?.reduce((acc: Record<string, any>, item: any) => {
      const type = item.grammar_type
      if (!acc[type]) {
        acc[type] = { total: 0, beginner: 0, intermediate: 0, advanced: 0 }
      }
      acc[type].total += 1
      if (item.difficulty_level === 'beginner') acc[type].beginner += 1
      else if (item.difficulty_level === 'intermediate') acc[type].intermediate += 1
      else if (item.difficulty_level === 'advanced') acc[type].advanced += 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      questions: questions || [],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
      grammarTypeCounts,
      grammarTypeDetails
    })

  } catch (error) {
    console.error("Error in question validation API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const { questionId, validationStatus, validationNotes } = await request.json()

    if (!questionId || !validationStatus) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("grammar_questions")
      .update({
        is_validated: true,
        validation_status: validationStatus,
        validation_notes: validationNotes || null,
        validated_by: user.id,
        validated_at: new Date().toISOString()
      })
      .eq("id", questionId)
      .select()

    if (error) {
      console.error("Error updating validation status:", error)
      return NextResponse.json({ error: "Failed to update validation status" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      question: data[0]
    })

  } catch (error) {
    console.error("Error in validation update:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
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

    const { questionIds } = await request.json()

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: "Question IDs are required" }, { status: 400 })
    }

    // Delete multiple questions
    const { data, error } = await supabase
      .from("grammar_questions")
      .delete()
      .in("id", questionIds)
      .select("id, question_text")

    if (error) {
      console.error("Error deleting duplicate questions:", error)
      return NextResponse.json({ error: "Failed to delete questions" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedCount: data?.length || 0,
      deletedQuestions: data || []
    })

  } catch (error) {
    console.error("Error in duplicate deletion API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    // Find duplicate questions based on question_text
    const { data: questions, error } = await supabase
      .from("grammar_questions")
      .select("id, question_text, grammar_type, difficulty_level, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching questions for duplicate detection:", error)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    // Group by question_text (case-insensitive and trimmed)
    const questionGroups: Record<string, any[]> = {}
    
    questions?.forEach((question: any) => {
      const normalizedText = question.question_text.trim().toLowerCase()
      if (!questionGroups[normalizedText]) {
        questionGroups[normalizedText] = []
      }
      questionGroups[normalizedText].push(question)
    })

    // Find groups with duplicates
    const duplicateGroups = Object.entries(questionGroups)
      .filter(([_, group]) => group.length > 1)
      .map(([normalizedText, group]) => ({
        questionText: group[0].question_text, // Original text
        count: group.length,
        questions: group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) // Oldest first
      }))

    return NextResponse.json({
      success: true,
      duplicateGroups,
      totalDuplicates: duplicateGroups.reduce((acc, group) => acc + group.count - 1, 0)
    })

  } catch (error) {
    console.error("Error in duplicate detection API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

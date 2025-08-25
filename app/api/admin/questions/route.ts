import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const grammarType = searchParams.get("grammarType")
    const difficultyLevel = searchParams.get("difficultyLevel")

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
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
  
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let query = supabase
      .from("grammar_questions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (grammarType && grammarType !== "all") {
      query = query.eq("grammar_type", grammarType)
    }
    if (difficultyLevel) {
      query = query.eq("difficulty_level", difficultyLevel)
    }

    const { data: questions, error: questionsError, count } = await query

    if (questionsError) {
      console.error("Questions fetch error:", questionsError)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      questions: questions || [],
      totalCount: count || 0,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("DELETE request received")
    const body = await request.json()
    console.log("Request body:", body)
    const { questionId, deleteAll } = body

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
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
  
    const userResult = await supabase.auth.getUser()
    const user = userResult?.data?.user
    const authError = userResult?.error

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (deleteAll) {
      // 모든 문제 id 조회
      const { data: allQuestions, error: fetchError } = await (supabase as any)
        .from("grammar_questions")
        .select("id")
      if (fetchError) {
        console.error("Question fetch error:", fetchError)
        return NextResponse.json({ error: "전체 문제 목록을 불러오지 못했습니다." }, { status: 500 })
      }
      if (!allQuestions || allQuestions.length === 0) {
        return NextResponse.json({ success: true, message: "삭제할 문제가 없습니다." })
      }
      // 하나씩 순차적으로 삭제
      for (const q of allQuestions) {
        const { error: deleteError } = await (supabase as any)
          .from("grammar_questions")
          .delete()
          .eq("id", q.id)
        if (deleteError) {
          console.error("Question delete error:", deleteError)
          return NextResponse.json({ error: `문제(id: ${q.id}) 삭제 실패: ${deleteError.message}` }, { status: 500 })
        }
      }
      return NextResponse.json({ success: true, message: "모든 문제가 순차적으로 삭제되었습니다." })
    }

    if (!deleteAll && (!questionId || typeof questionId !== "string" || questionId.trim() === "")) {
      console.log("Invalid questionId:", questionId)
      return NextResponse.json({ error: "No valid questionId provided" }, { status: 400 })
    }

    console.log("Attempting to delete question with ID:", questionId)
    const { data: deleteData, error: deleteError } = await supabase
      .from("grammar_questions")
      .delete()
      .eq("id", questionId)

    console.log("Delete operation result:", { deleteData, deleteError })

    if (deleteError) {
      console.error("Question delete error:", deleteError)
      return NextResponse.json({ 
        error: `Failed to delete question: ${deleteError.message}`,
        details: deleteError 
      }, { status: 500 })
    }

    console.log("Question deleted successfully")
    return NextResponse.json({ success: true, deletedId: questionId })
  } catch (error) {
    console.error("Error deleting question:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}

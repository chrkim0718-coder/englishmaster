import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { questionId, aiResult } = await request.json()
    if (!questionId || !aiResult) {
      return NextResponse.json({ error: "questionId와 aiResult가 필요합니다." }, { status: 400 })
    }

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
            } catch {}
          },
        },
      }
    )

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // grammar_questions 업데이트
    const updateObj: any = {
      is_validated: true,
      validation_status: aiResult.score >= 70 ? "approved" : "needs_review",
      validation_notes: `AI 검증 점수: ${aiResult.score}/100\n문제점: ${aiResult.issues?.join(", ") || ''}\n제안사항: ${aiResult.suggestions?.join(", ") || ''}\nAI 평가: ${aiResult.aiNotes}`,
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    }
    // AI 제안이 있으면 옵션/정답/해설 자동 반영
    if (aiResult.suggestions) {
      for (const s of aiResult.suggestions) {
        if (/보기|선택지|option/i.test(s)) {
          const match = s.match(/A[.:-]?\s*([^,]+),?\s*B[.:-]?\s*([^,]+),?\s*C[.:-]?\s*([^,]+),?\s*D[.:-]?\s*([^,]+)/i)
          if (match) {
            updateObj.option_a = match[1].trim()
            updateObj.option_b = match[2].trim()
            updateObj.option_c = match[3].trim()
            updateObj.option_d = match[4].trim()
          }
        }
        if (/정답|answer/i.test(s)) {
          const match = s.match(/([A-D])/i)
          if (match) {
            updateObj.correct_answer = match[1].toUpperCase()
          }
        }
        if (/해설|설명|explanation/i.test(s)) {
          const match = s.match(/해설[\s:：-]+(.+)/i) || s.match(/explanation[\s:：-]+(.+)/i)
          if (match) {
            updateObj.explanation = match[1].trim()
          } else {
            updateObj.explanation = s.replace(/^(해설|설명|explanation)[\s:：-]*/i, '').trim()
          }
        }
      }
    }
    const { error: updateError } = await supabase
      .from("grammar_questions")
      .update(updateObj)
      .eq("id", questionId)
    if (updateError) {
      return NextResponse.json({ error: "DB 업데이트 실패", details: updateError.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

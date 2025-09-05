import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET() {
  const supabase = createServiceClient()

  // 사용자 목록 가져오기
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, email")
  if (userError || !users) {
    return NextResponse.json({ error: "사용자 목록을 불러올 수 없습니다." }, { status: 500 })
  }

  // 사용자별 퀴즈 통계 계산
  const stats = []
  for (const user of users) {
    const { data: quizResults } = await supabase
      .from("quiz_results")
      .select("score")
      .eq("user_id", user.id)

    const quizCount = quizResults?.length || 0
    const avgScore =
      quizCount > 0
        ? Math.round(
            (quizResults!.reduce((sum, q) => sum + (q.score ?? 0), 0) / quizCount) * 100
          ) / 100
        : 0

    stats.push({
      email: user.email,
      quizCount,
      avgScore,
    })
  }

  return NextResponse.json({ stats })
}

export async function POST() {
  const supabase = createServiceClient()

  // 테스트 데이터 추가
  const testData = [
    { user_id: 1, score: 80 },
    { user_id: 1, score: 90 },
    { user_id: 2, score: 70 },
    { user_id: 2, score: 85 },
    { user_id: 3, score: 60 },
  ]

  const { error } = await supabase.from("quiz_results").insert(testData)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "테스트 데이터가 추가되었습니다." })
}
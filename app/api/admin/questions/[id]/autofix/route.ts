import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { runGeminiValidationAndAutoFix, generateGeminiValidation } from "@/lib/ai/gemini";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  // 1차 자동수정
  const { success, error } = await runGeminiValidationAndAutoFix(supabase, id);
  if (!success) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }

  // 2차: 자동수정된 문제를 다시 불러와 Gemini로 재검증
  const { data: updatedQuestion, error: fetchError } = await supabase
    .from("grammar_questions")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !updatedQuestion) {
    return NextResponse.json({ success: false, error: "자동수정 후 문제 조회 실패" }, { status: 500 });
  }
  let revalidationResult = null;
  try {
    revalidationResult = await generateGeminiValidation(updatedQuestion);
  } catch (err: any) {
    return NextResponse.json({ success: true, revalidation: null, revalidationError: err.message });
  }
  return NextResponse.json({ success: true, revalidation: revalidationResult });
}

import { type NextRequest, NextResponse } from "next/server"
import { createApiClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('🔄 Starting session data migration for user:', user.id)

    // Get all quiz sessions for this user
    const { data: sessions, error: sessionsError } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("user_id", user.id)

    if (sessionsError) {
      console.error("Sessions fetch error:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    console.log(`📋 Found ${sessions?.length || 0} sessions to migrate`)

    let totalMigrated = 0

    for (const session of sessions || []) {
      if (!session.session_data?.questions || !session.session_data?.answers) {
        console.log(`⏭️ Skipping session ${session.id} - no question/answer data`)
        continue
      }

      const { questions, answers } = session.session_data
      
      // Extract individual answers from session data
      const userAnswers = questions.map((question: any, index: number) => {
        const selectedAnswer = Array.isArray(answers) ? answers[index] : answers[index.toString()]
        return {
          user_id: user.id,
          question_id: question.id,
          selected_answer: selectedAnswer,
          is_correct: selectedAnswer === question.correct_answer,
        }
      })

      console.log(`💾 Migrating ${userAnswers.length} answers from session ${session.id}`)

      // Insert answers with upsert to handle duplicates
      const { error: answersError } = await supabase
        .from("user_answers")
        .upsert(userAnswers, { 
          onConflict: "user_id,question_id",
          ignoreDuplicates: false 
        })

      if (answersError) {
        console.error(`❌ Error migrating session ${session.id}:`, answersError)
      } else {
        console.log(`✅ Successfully migrated session ${session.id}`)
        totalMigrated += userAnswers.length
      }
    }

    console.log(`🎉 Migration complete! Total answers migrated: ${totalMigrated}`)

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${totalMigrated} answers from ${sessions?.length || 0} sessions`,
      totalSessions: sessions?.length || 0,
      totalAnswers: totalMigrated
    })

  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json({ error: "Migration failed" }, { status: 500 })
  }
}

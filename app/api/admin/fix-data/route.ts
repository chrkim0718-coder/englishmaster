import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
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

    const { action } = await request.json()

    switch (action) {
      case 'fix_difficulty_levels':
        // Fix sessions without difficulty_level by setting them to 'beginner'
        // First get all sessions to check their difficulty_level values
        const { data: allSessions, error: allSessionsError } = await supabase
          .from("quiz_sessions")
          .select("id, difficulty_level")

        if (allSessionsError) {
          return NextResponse.json({ 
            success: false, 
            error: "데이터 조회 실패: " + allSessionsError.message 
          }, { status: 400 })
        }

        // Filter sessions that need fixing (null, undefined, or empty string)
        const sessionsToFix = allSessions?.filter(session => 
          !session.difficulty_level || 
          session.difficulty_level === '' || 
          session.difficulty_level === null
        ) || []

        console.log(`🔧 Found ${sessionsToFix.length} sessions to fix:`, sessionsToFix.map(s => ({ id: s.id, difficulty: s.difficulty_level })))

        if (sessionsToFix.length === 0) {
          return NextResponse.json({ 
            success: true, 
            message: "수정할 데이터가 없습니다",
            fixed: 0
          })
        }

        // Update sessions to set difficulty_level to 'beginner'
        // Use individual updates to avoid potential batch update issues
        let successCount = 0
        let errorCount = 0
        
        // Create a fresh service role client to ensure proper permissions
        const { createClient: createDifficultyClient } = require('@supabase/supabase-js')
        const serviceSupabase = createDifficultyClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
        
        for (const session of sessionsToFix) {
          try {
            const { error: singleUpdateError, data: updateData } = await serviceSupabase
              .from("quiz_sessions")
              .update({ difficulty_level: 'beginner' })
              .eq('id', session.id)
              .select()
            
            if (singleUpdateError) {
              console.error(`❌ Failed to update session ${session.id}:`, singleUpdateError)
              errorCount++
            } else if (updateData && updateData.length > 0) {
              console.log(`✅ Updated session ${session.id}: ${updateData[0].difficulty_level}`)
              successCount++
            } else {
              console.error(`❌ No rows updated for session ${session.id}`)
              errorCount++
            }
          } catch (error) {
            console.error(`❌ Exception updating session ${session.id}:`, error)
            errorCount++
          }
        }

        console.log(`✅ Successfully updated ${successCount} sessions, ${errorCount} errors`)

        // Verify the update by checking the sessions again
        const { data: verificationSessions, error: verifyError } = await serviceSupabase
          .from("quiz_sessions")
          .select("id, difficulty_level")
          .in('id', sessionsToFix.map(s => s.id))

        if (!verifyError && verificationSessions) {
          const stillEmpty = verificationSessions.filter((s: any) => !s.difficulty_level || s.difficulty_level === '')
          console.log(`🔍 Verification: ${stillEmpty.length} sessions still have empty difficulty after update`)
          if (stillEmpty.length > 0) {
            console.log(`❌ Still empty sessions:`, stillEmpty.slice(0, 3))
          }
        }

        if (errorCount > 0) {
          return NextResponse.json({ 
            success: false, 
            error: `${errorCount}개 세션 수정 실패, ${successCount}개 성공` 
          }, { status: 400 })
        }

        return NextResponse.json({ 
          success: true, 
          message: `${successCount}개의 세션 난이도를 '초급'으로 설정했습니다`,
          fixed: successCount
        })

      case 'fix_current_user_difficulty':
        // Fix current user's sessions specifically - use regular client for proper user context
        const regularClient = createServerClient(
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

        const { data: { user: currentUser }, error: getCurrentUserError } = await regularClient.auth.getUser()
        
        if (getCurrentUserError || !currentUser) {
          return NextResponse.json({ 
            success: false, 
            error: "사용자 인증 실패" 
          }, { status: 401 })
        }

        console.log(`👤 Current user: ${currentUser.email} (ID: ${currentUser.id})`)

        const { data: userSessions, error: userSessionsError } = await supabase
          .from("quiz_sessions")
          .select("id, difficulty_level")
          .eq("user_id", currentUser.id)

        if (userSessionsError) {
          return NextResponse.json({ 
            success: false, 
            error: "사용자 세션 조회 실패: " + userSessionsError.message 
          }, { status: 400 })
        }

        const userSessionsToFix = userSessions?.filter(session => 
          !session.difficulty_level || 
          session.difficulty_level === '' || 
          session.difficulty_level === null
        ) || []

        console.log(`🔧 Found ${userSessionsToFix.length} user sessions to fix for user ${currentUser.email}:`, userSessionsToFix)

        if (userSessionsToFix.length === 0) {
          return NextResponse.json({ 
            success: true, 
            message: "현재 사용자의 수정할 데이터가 없습니다",
            fixed: 0
          })
        }

        const { error: userUpdateError } = await supabase
          .from("quiz_sessions")
          .update({ difficulty_level: 'beginner' })
          .in('id', userSessionsToFix.map(s => s.id))

        if (userUpdateError) {
          console.error("❌ User update error:", userUpdateError)
          return NextResponse.json({ 
            success: false, 
            error: "사용자 세션 수정 실패: " + userUpdateError.message 
          }, { status: 400 })
        }

        console.log(`✅ Successfully updated ${userSessionsToFix.length} user sessions`)

        return NextResponse.json({ 
          success: true, 
          message: `현재 사용자의 ${userSessionsToFix.length}개 세션 난이도를 '초급'으로 설정했습니다`,
          fixed: userSessionsToFix.length
        })

      case 'fix_grammar_types':
        // Fix English grammar types to Korean
        const grammarMapping: Record<string, string> = {
          "Present Simple": "현재시제",
          "Present Perfect": "현재완료", 
          "Past Simple": "과거시제",
          "Past Perfect": "과거완료",
          "Future Tense": "미래시제",
          "Conditionals": "가정법",
          "Passive Voice": "수동태",
          "Modal Verbs": "조동사",
          "Gerunds and Infinitives": "동명사/부정사",
          "Gerunds": "동명사",
          "Infinitives": "부정사",
          "Participles": "분사",
          "Articles": "관사",
          "Prepositions": "전치사",
          "Relative Clauses": "관계사",
          "Conjunctions": "접속사",
          "Tenses": "시제",
        }

        // Create a fresh service role client for grammar type updates
        const { createClient: createServiceClient } = require('@supabase/supabase-js')
        const grammarServiceSupabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )

        let fixedGrammarCount = 0
        let grammarErrors = 0
        
        for (const [english, korean] of Object.entries(grammarMapping)) {
          const { data: sessionsToUpdate, error: grammarFetchError } = await grammarServiceSupabase
            .from("quiz_sessions")
            .select("id")
            .eq("grammar_type", english)

          if (grammarFetchError) {
            console.error(`❌ Error fetching sessions for ${english}:`, grammarFetchError)
            grammarErrors++
            continue
          }

          if (sessionsToUpdate && sessionsToUpdate.length > 0) {
            console.log(`🔧 Found ${sessionsToUpdate.length} sessions with grammar type '${english}' to update to '${korean}'`)
            
            const { error: grammarUpdateError, data: updateResult } = await grammarServiceSupabase
              .from("quiz_sessions")
              .update({ grammar_type: korean })
              .eq("grammar_type", english)
              .select()

            if (grammarUpdateError) {
              console.error(`❌ Error updating ${english} to ${korean}:`, grammarUpdateError)
              grammarErrors++
            } else {
              console.log(`✅ Successfully updated ${updateResult?.length || 0} sessions from '${english}' to '${korean}'`)
              fixedGrammarCount += sessionsToUpdate.length
            }
          } else {
            console.log(`ℹ️ No sessions found with grammar type '${english}'`)
          }
        }

        console.log(`🎯 Grammar type fix summary: ${fixedGrammarCount} sessions updated, ${grammarErrors} errors`)

        if (grammarErrors > 0) {
          return NextResponse.json({ 
            success: false, 
            error: `${grammarErrors}개 문법 유형 수정 실패, ${fixedGrammarCount}개 성공` 
          }, { status: 400 })
        }

        return NextResponse.json({ 
          success: true, 
          message: `${fixedGrammarCount}개의 세션 문법 유형을 한글로 변경했습니다`,
          fixed: fixedGrammarCount
        })

      default:
        return NextResponse.json({ 
          success: false, 
          error: "유효하지 않은 액션입니다" 
        }, { status: 400 })
    }

  } catch (error) {
    console.error("Fix data error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "서버 오류가 발생했습니다" 
    }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { generateGrammarQuestions } from "@/lib/ai"
import { createServiceClient } from "@/lib/supabase/service"
import { REVERSE_DIFFICULTY_MAPPING } from "@/lib/ai/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Received request:", body)

    // Check if this is a batch request
    if (body.batchType === "all_grammar_types") {
      return await handleBatchGeneration(body)
    }

    // Handle single grammar type generation (existing logic)
    const { grammarType, difficultyLevel, count = 5 } = body

    // Validate input
    if (!grammarType || !difficultyLevel) {
      console.log("Missing required fields:", { grammarType, difficultyLevel })
      return NextResponse.json({ error: "Grammar type and difficulty level are required" }, { status: 400 })
    }

    // 영어 난이도를 한글로 변환 (영어와 한글 모두 지원)
    const koreanDifficulty = REVERSE_DIFFICULTY_MAPPING[difficultyLevel] || difficultyLevel
    console.log("Difficulty mapping:", difficultyLevel, "→", koreanDifficulty)

    // 한글 난이도 검증
    if (!["초급", "중급", "고급"].includes(koreanDifficulty)) {
      console.log("Invalid difficulty level:", difficultyLevel, "mapped to:", koreanDifficulty)
      return NextResponse.json({ error: "Invalid difficulty level" }, { status: 400 })
    }

    // Generate questions using selected AI provider
    console.log("Generating questions with:", { grammarType, difficultyLevel: koreanDifficulty, count, aiProvider: body.aiProvider })
    const questions = await generateGrammarQuestions(grammarType, koreanDifficulty, count, body.aiProvider)

    // Add delay for individual generation to prevent rate limiting (Gemini는 3초)
    if (body.aiProvider === 'gemini' || !body.aiProvider) {
      console.log("⏳ Adding 3 seconds delay for Gemini to prevent rate limiting...")
      await new Promise(resolve => setTimeout(resolve, 3000))
    } else {
      console.log("⏳ Adding 1 second delay to prevent rate limiting...")
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase.from("grammar_questions").insert(questions).select()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save questions to database" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      questions: data,
      count: data?.length || 0,
    })
  } catch (error) {
    console.error("Error in generate-questions API:", error)
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}

async function handleBatchGeneration(body: any) {
  try {
    const { difficultyLevel, countPerType = 1, aiProvider } = body

    // Validate input
    if (!difficultyLevel) {
      return NextResponse.json({ error: "Difficulty level is required for batch generation" }, { status: 400 })
    }

    if (!["초급", "중급", "고급"].includes(difficultyLevel)) {
      return NextResponse.json({ error: "Invalid difficulty level" }, { status: 400 })
    }

    // All available grammar types
    const grammarTypes = [
      "가정법", "관계사", "동명사", "부정사", "분사", 
      "수동태", "시제", "전치사", "접속사", "조동사"
    ]

    console.log(`Generating batch with ${aiProvider || 'default'} provider: ${countPerType} questions per type for ${grammarTypes.length} grammar types at ${difficultyLevel} level`)

    const allQuestions = []
    let successCount = 0
    let failureCount = 0

    // Generate questions for each grammar type with delay to avoid rate limiting
    for (let i = 0; i < grammarTypes.length; i++) {
      const grammarType = grammarTypes[i]
      try {
        console.log(`Generating ${grammarType} questions... (${i + 1}/${grammarTypes.length})`)
        const questions = await generateGrammarQuestions(grammarType, difficultyLevel, countPerType, aiProvider)
        allQuestions.push(...questions)
        successCount++
        console.log(`✅ Successfully generated ${questions.length} ${grammarType} questions`)
        
        // Add delay between requests to avoid rate limiting (except for the last request)
        if (i < grammarTypes.length - 1) {
          if (aiProvider === 'gemini' || !aiProvider) {
            console.log(`⏳ Waiting 3 seconds before next Gemini request...`)
            await new Promise(resolve => setTimeout(resolve, 3000))
          } else {
            console.log(`⏳ Waiting 2 seconds before next request...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      } catch (error) {
        console.error(`❌ Failed to generate ${grammarType} questions:`, error)
        failureCount++
        
        // Still add delay after failed requests to avoid overwhelming the API
        if (i < grammarTypes.length - 1) {
          console.log(`⏳ Waiting 1 second after error before next request...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    console.log(`\n📊 Batch Generation Summary:`)
    console.log(`✅ Successfully generated: ${successCount}/${grammarTypes.length} grammar types`)
    console.log(`❌ Failed to generate: ${failureCount}/${grammarTypes.length} grammar types`)
    console.log(`📝 Total questions created: ${allQuestions.length}`)

    if (allQuestions.length === 0) {
      return NextResponse.json({ 
        error: "Failed to generate any questions",
        summary: {
          totalTypes: grammarTypes.length,
          successCount,
          failureCount,
          totalQuestions: 0
        }
      }, { status: 500 })
    }

    // Save all questions to database
    const supabase = createServiceClient()
    const { data, error } = await supabase.from("grammar_questions").insert(allQuestions).select()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save questions to database" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      questions: data,
      totalCount: data?.length || 0,
      successCount,
      failureCount,
      totalTypes: grammarTypes.length,
      batchSummary: {
        totalGrammarTypes: grammarTypes.length,
        successfulTypes: successCount,
        failedTypes: failureCount,
        questionsPerType: countPerType,
        totalQuestionsGenerated: allQuestions.length
      }
    })
  } catch (error) {
    console.error("Error in batch generation:", error)
    return NextResponse.json({ error: "Failed to generate batch questions" }, { status: 500 })
  }
}

import { createClient } from "@/lib/supabase/server"
import { generateGeminiValidation } from "@/lib/ai/gemini"
import { NextRequest, NextResponse } from "next/server"

interface AIValidationResult {
  questionId: string
  isValid: boolean
  score: number
  issues: string[]
  suggestions: string[]
  aiNotes: string
}

const validateQuestionWithAI = async (question: any, lmstudioUrl: string, modelName?: string): Promise<AIValidationResult> => {
  const prompt = `
다음 영어 문법 문제를 검증해주세요. 문제의 정확성, 선택지의 적절성, 정답의 올바름, 해설의 명확성을 평가해주세요.

**문제 정보:**
- 문법 유형: ${question.grammar_type}
- 난이도: ${question.difficulty_level}
- 문제: ${question.question_text}
- 선택지:
  A. ${question.option_a}
  B. ${question.option_b}
  C. ${question.option_c}
  D. ${question.option_d}
- 정답: ${question.correct_answer}
- 해설: ${question.explanation}

**검증 기준:**
1. 문제가 명확하고 이해하기 쉬운가?
2. 선택지가 적절하고 혼동을 줄 수 있는가?
3. 정답이 올바른가?
4. 해설이 명확하고 교육적인가?
5. 문법 유형과 난이도가 적절한가?

다음 JSON 형식으로 응답해주세요:
{
  "isValid": true/false,
  "score": 0-100,
  "issues": ["발견된 문제점들"],
  "suggestions": ["개선 제안사항들"],
  "aiNotes": "전체적인 평가 및 코멘트"
}
`

  try {
    // Construct the correct URL - avoid double /v1
    let apiUrl = lmstudioUrl
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1) // Remove trailing slash
    }
    
    // Check if URL already contains /v1
    const chatCompletionsUrl = apiUrl.includes('/v1') 
      ? `${apiUrl}/chat/completions`
      : `${apiUrl}/v1/chat/completions`
    
    console.log("Making request to:", chatCompletionsUrl)
    
    const response = await fetch(chatCompletionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName || "llama-3.2-3b-instruct",
        messages: [
          {
            role: "system",
            content: "당신은 영어 교육 전문가입니다. 영어 문법 문제를 정확하고 객관적으로 평가해주세요. 항상 JSON 형식으로만 응답하세요."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`LMStudio API error: ${response.status} - ${response.statusText}`, errorText)
      throw new Error(`LMStudio API error: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()
    console.log("LMStudio API response structure:", JSON.stringify(data, null, 2))
    
    // Handle different response structures
    let aiResponse: string | null = null
    
    if (data.choices && data.choices[0]?.message?.content) {
      // Standard OpenAI format
      aiResponse = data.choices[0].message.content
    } else if (data.content) {
      // Alternative format
      aiResponse = data.content
    } else if (data.response) {
      // Another alternative format
      aiResponse = data.response
    } else if (data.text) {
      // Text format
      aiResponse = data.text
    } else if (typeof data === 'string') {
      // Direct string response
      aiResponse = data
    }

    console.log("Extracted AI response:", aiResponse)

    if (!aiResponse) {
      console.error("No valid response found in data:", data)
      throw new Error("No response from AI - check LMStudio response format")
    }

    // Parse AI response
    let parsedResponse
    try {
      console.log("Raw AI response to parse:", aiResponse)
      
      // Try multiple parsing strategies
      let jsonString = aiResponse.trim()
      
      // 1. Extract JSON from markdown code blocks
      const markdownMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (markdownMatch) {
        jsonString = markdownMatch[1].trim()
        console.log("Extracted from markdown:", jsonString)
      }
      
      // 2. Extract JSON object from text
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
      if (jsonMatch && !markdownMatch) {
        jsonString = jsonMatch[0].trim()
        console.log("Extracted JSON object:", jsonString)
      }
      
      // 3. Try to parse
      parsedResponse = JSON.parse(jsonString)
      console.log("Successfully parsed response:", parsedResponse)
      
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse)
      console.error("Parse error:", parseError)
      
      // Fallback: create a default response with the raw text
      parsedResponse = {
        isValid: false,
        score: 0,
        issues: ["AI 응답 파싱 실패"],
        suggestions: [],
        decision: "needs_review",
        aiNotes: `원본 응답: ${aiResponse.substring(0, 200)}...`
      }
      console.log("Using fallback response:", parsedResponse)
    }

    return {
      questionId: question.id,
      isValid: parsedResponse.isValid || false,
      score: parsedResponse.score || 0,
      issues: parsedResponse.issues || [],
      suggestions: parsedResponse.suggestions || [],
      aiNotes: parsedResponse.aiNotes || "AI 평가 완료"
    }

  } catch (error) {
    console.error("AI validation error:", error)
    
    // Determine error type for better user feedback
    let errorMessage = "AI 검증 실패"
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = "LMStudio 서버에 연결할 수 없습니다"
      } else if (error.message.includes('timeout')) {
        errorMessage = "AI 응답 시간 초과"
      } else if (error.message.includes('API error')) {
        errorMessage = `LMStudio API 오류: ${error.message}`
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      questionId: question.id,
      isValid: false,
      score: 0,
      issues: ["AI 검증 실패"],
      suggestions: [],
      aiNotes: errorMessage
    }
  }
}

export async function POST(request: NextRequest) {
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

    const { questionIds, lmstudioUrl, model } = await request.json()

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: "Question IDs are required" }, { status: 400 })
    }

    // Gemini 분기: lmstudioUrl 없이 처리
    if (model === 'gemini') {
      // Fetch questions to validate
      const { data: questions, error: fetchError } = await supabase
        .from("grammar_questions")
        .select("*")
        .in("id", questionIds)

      if (fetchError) {
        console.error("Error fetching questions:", fetchError)
        return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
      }

      if (!questions || questions.length === 0) {
        return NextResponse.json({ error: "No questions found" }, { status: 404 })
      }

      // 실제 Gemini API를 사용한 검증 및 60점 미만 자동 수정
      const validationResults: AIValidationResult[] = [];
      for (const q of questions) {
        try {
          const geminiResult = await generateGeminiValidation(q);
          // 60점 미만이면 문제, 해설, 상태 등 즉시 업데이트
          if (geminiResult.score < 60) {
            // suggestions에서 보기/정답/해설 자동 추출 및 수정
            let updateObj: any = {
              is_validated: false,
              validation_status: "needs_review",
              validated_by: user.id,
              validated_at: new Date().toISOString(),
            };
            let modifiedFields: string[] = [];
            // suggestions에서 각 항목 추출
            for (const s of geminiResult.suggestions) {
              if (/보기|선택지|option/i.test(s)) {
                const match = s.match(/A[.:-]?\s*([^,]+),?\s*B[.:-]?\s*([^,]+),?\s*C[.:-]?\s*([^,]+),?\s*D[.:-]?\s*([^,]+)/i);
                if (match) {
                  updateObj.option_a = match[1].trim();
                  updateObj.option_b = match[2].trim();
                  updateObj.option_c = match[3].trim();
                  updateObj.option_d = match[4].trim();
                  modifiedFields.push('보기');
                }
              }
              if (/정답|answer/i.test(s)) {
                const match = s.match(/([A-D])/i);
                if (match) {
                  updateObj.correct_answer = match[1].toUpperCase();
                  modifiedFields.push('정답');
                }
              }
              if (/해설|설명|explanation/i.test(s)) {
                const match = s.match(/해설[\s:：-]+(.+)/i) || s.match(/explanation[\s:：-]+(.+)/i);
                if (match) {
                  updateObj.explanation = match[1].trim();
                  modifiedFields.push('해설');
                } else {
                  updateObj.explanation = s.replace(/^(해설|설명|explanation)[\s:：-]*/i, '').trim();
                  modifiedFields.push('해설');
                }
              }
            }
            const validationNotes = `AI 검증 점수: ${geminiResult.score}/100\n문제점: ${geminiResult.issues.join(", ")}\n제안사항: ${geminiResult.suggestions.join(", ")}\nAI 평가: ${geminiResult.aiNotes}` + (modifiedFields.length > 0 ? `\n[자동수정됨: ${modifiedFields.join(", ")}]` : '');
            updateObj.validation_notes = validationNotes;
            await supabase
              .from("grammar_questions")
              .update(updateObj)
              .eq("id", q.id);
          }
          validationResults.push({
            questionId: q.id,
            isValid: geminiResult.isValid,
            score: geminiResult.score,
            issues: geminiResult.issues,
            suggestions: geminiResult.suggestions,
            aiNotes: geminiResult.aiNotes,
          });
        } catch (err: any) {
          validationResults.push({
            questionId: q.id,
            isValid: false,
            score: 0,
            issues: [err.message || 'Gemini 검증 실패'],
            suggestions: [],
            aiNotes: err.message || 'Gemini 검증 실패',
          });
        }
      }

      const needsFix = validationResults.filter(r => !r.isValid || r.score < 70)
      return NextResponse.json({
        success: true,
        validatedCount: validationResults.length,
        failedCount: validationResults.filter(r => !r.isValid).length,
        approvedCount: validationResults.filter(r => r.isValid && r.score >= 70).length,
        needsReviewCount: validationResults.filter(r => r.isValid && r.score < 70).length,
        results: validationResults,
        needsFix,
        needsFixCount: needsFix.length,
        message: `${validationResults.length}개 문제가 Gemini로 검증되었습니다.`
      })
    }

    // LMStudio 분기 (기존 로직)
    if (!lmstudioUrl) {
      return NextResponse.json({ error: "LMStudio URL is required" }, { status: 400 })
    }

    // Test LMStudio connection first
    try {
      const testResponse = await fetch(`${lmstudioUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      if (!testResponse.ok) {
        throw new Error(`LMStudio server responded with status: ${testResponse.status}`)
      }
    } catch (connectionError) {
      console.error("LMStudio connection test failed:", connectionError)
      return NextResponse.json({ 
        error: "LMStudio 서버에 연결할 수 없습니다. LMStudio가 실행 중이고 올바른 URL인지 확인해주세요.",
        details: connectionError instanceof Error ? connectionError.message : "Connection failed"
      }, { status: 503 })
    }

    // Fetch questions to validate
    const { data: questions, error: fetchError } = await supabase
      .from("grammar_questions")
      .select("*")
      .in("id", questionIds)

    if (fetchError) {
      console.error("Error fetching questions:", fetchError)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "No questions found" }, { status: 404 })
    }

    console.log(`🤖 Starting AI validation for ${questions.length} questions`)

    // Get current LMStudio model
    let currentModel = "llama-3.2-3b-instruct" // fallback
    try {
      const modelResponse = await fetch(`${lmstudioUrl}/v1/models`)
      if (modelResponse.ok) {
        const modelData = await modelResponse.json()
        if (modelData.data && modelData.data.length > 0) {
          currentModel = modelData.data[0].id
          console.log(`🎯 Using LMStudio model: ${currentModel}`)
        }
      }
    } catch (error) {
      console.log("Failed to get current model, using fallback:", error)
    }

    // Validate each question with AI
    const validationResults: AIValidationResult[] = []
    let successCount = 0
    let failCount = 0
    

    for (const question of questions) {
      // 1. 문제에 빈칸이 없으면 자동 삭제
      if (!question.question_text || !question.question_text.match(/_{2,}|____|\[\]/i)) {
        await supabase.from("grammar_questions").delete().eq("id", question.id);
        console.log(`🗑️ Deleted question (no blank): ${question.id}`);
        continue;
      }

      // 2. 정답이 보기 중에 없으면 자동 삭제
      const answer = question.correct_answer?.toUpperCase();
      const options = [
        question.option_a, question.option_b, question.option_c, question.option_d
      ].map(opt => (opt || '').trim());
      const answerIndex = ['A', 'B', 'C', 'D'].indexOf(answer);
      if (answerIndex === -1 || !options[answerIndex] || options[answerIndex] === '') {
        await supabase.from("grammar_questions").delete().eq("id", question.id);
        console.log(`🗑️ Deleted question (invalid answer): ${question.id}`);
        continue;
      }

      // 3. 해설에서 정답이 틀렸다고 언급된 경우 자동 삭제
      if (question.explanation && /정답.?틀리|정답.?오류|정답.?잘못|wrong answer|incorrect answer|answer is wrong|answer is incorrect/i.test(question.explanation)) {
        await supabase.from("grammar_questions").delete().eq("id", question.id);
        console.log(`🗑️ Deleted question (explanation says answer is wrong): ${question.id}`);
        continue;
      }

      console.log(`🔍 Validating question: ${question.id}`)
      const result = await validateQuestionWithAI(question, lmstudioUrl, currentModel)
      validationResults.push(result)

      if (result.score > 0) {
        successCount++
      } else {
        failCount++
      }

      // 자동 수정 로직 (Gemini와 동일하게 suggestions 파싱)
      let updateObj: any = {
        is_validated: true,
        validation_status: result.isValid && result.score >= 70 ? "approved" : "needs_review",
        validation_notes: `AI 검증 점수: ${result.score}/100\n문제점: ${result.issues.join(", ")}\n제안사항: ${result.suggestions.join(", ")}\nAI 평가: ${result.aiNotes}`,
        validated_by: user.id,
        validated_at: new Date().toISOString()
      };
      let modifiedFields: string[] = [];
      for (const s of result.suggestions || []) {
        if (/보기|선택지|option/i.test(s)) {
          const match = s.match(/A[.:-]?\s*([^,]+),?\s*B[.:-]?\s*([^,]+),?\s*C[.:-]?\s*([^,]+),?\s*D[.:-]?\s*([^,]+)/i);
          if (match) {
            updateObj.option_a = match[1].trim();
            updateObj.option_b = match[2].trim();
            updateObj.option_c = match[3].trim();
            updateObj.option_d = match[4].trim();
            modifiedFields.push('보기');
          }
        }
        if (/정답|answer/i.test(s)) {
          const match = s.match(/([A-D])/i);
          if (match) {
            updateObj.correct_answer = match[1].toUpperCase();
            modifiedFields.push('정답');
          }
        }
        if (/해설|설명|explanation/i.test(s)) {
          const match = s.match(/해설[\s:：-]+(.+)/i) || s.match(/explanation[\s:：-]+(.+)/i);
          if (match) {
            updateObj.explanation = match[1].trim();
            modifiedFields.push('해설');
          } else {
            updateObj.explanation = s.replace(/^(해설|설명|explanation)[\s:：-]*/i, '').trim();
            modifiedFields.push('해설');
          }
        }
      }
      if (modifiedFields.length > 0) {
        updateObj.validation_notes += `\n[자동수정됨: ${modifiedFields.join(", ")}]`;
      }
      await supabase
        .from("grammar_questions")
        .update(updateObj)
        .eq("id", question.id);
    }

    const approvedCount = validationResults.filter(r => r.isValid && r.score >= 70).length
    const needsReviewCount = successCount - approvedCount

    // If all validations failed, return error
    if (successCount === 0) {
      return NextResponse.json({
        error: "모든 문제의 AI 검증에 실패했습니다. LMStudio 서버 상태를 확인해주세요.",
        results: validationResults
      }, { status: 500 })
    }

    const needsFix = validationResults.filter(r => !r.isValid || r.score < 70)
    return NextResponse.json({
      success: true,
      validatedCount: successCount,
      failedCount: failCount,
      approvedCount,
      needsReviewCount,
      results: validationResults,
      needsFix,
      needsFixCount: needsFix.length,
      message: failCount > 0 ? `${successCount}/${validationResults.length}개 문제가 성공적으로 검증되었습니다.` : undefined
    })

  } catch (error) {
    console.error("Error in AI validation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

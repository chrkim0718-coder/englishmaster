import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

interface ValidationResult {
  category: string
  severity: 'error' | 'warning' | 'info'
  message: string
  data?: any
}

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  grammar_type: string
  difficulty_level: string
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

    const results: ValidationResult[] = []

    // 1. 모든 문제 데이터 가져오기
    const { data: questions, error: questionsError } = await supabase
      .from("grammar_questions")
      .select("*")

    if (questionsError) {
      results.push({
        category: "Database",
        severity: "error",
        message: `Failed to fetch questions: ${questionsError.message}`
      })
      return NextResponse.json({ results })
    }

    const typedQuestions = questions as Question[]
    console.log(`📊 Validating ${typedQuestions?.length || 0} questions`)

    // 2. 기본 데이터 무결성 검증
    const missingFields = typedQuestions?.filter((q: Question) => 
      !q.question_text || 
      !q.option_a || 
      !q.option_b || 
      !q.option_c || 
      !q.option_d || 
      !q.correct_answer || 
      !q.explanation || 
      !q.grammar_type || 
      !q.difficulty_level
    ) || []

    if (missingFields.length > 0) {
      results.push({
        category: "Data Integrity",
        severity: "error",
        message: `${missingFields.length} questions have missing required fields`,
        data: missingFields.map((q: Question) => ({ id: q.id, question_text: q.question_text }))
      })
    }

    // 3. 정답 검증 (A, B, C, D 중 하나인지)
    const invalidAnswers = typedQuestions?.filter((q: Question) => 
      !['A', 'B', 'C', 'D'].includes(q.correct_answer)
    ) || []

    if (invalidAnswers.length > 0) {
      results.push({
        category: "Answer Validation",
        severity: "error",
        message: `${invalidAnswers.length} questions have invalid correct_answer values`,
        data: invalidAnswers.map((q: Question) => ({ 
          id: q.id, 
          question_text: q.question_text?.substring(0, 50) + "...",
          correct_answer: q.correct_answer 
        }))
      })
    }

    // 4. 중복 문제 검사 (동일한 question_text)
    const questionTexts = typedQuestions?.map((q: Question) => q.question_text.trim().toLowerCase()) || []
    const duplicateTexts = questionTexts.filter((text: string, index: number) => 
      questionTexts.indexOf(text) !== index
    )

    if (duplicateTexts.length > 0) {
      const duplicateQuestions = typedQuestions?.filter((q: Question) => 
        duplicateTexts.includes(q.question_text.trim().toLowerCase())
      ) || []
      
      results.push({
        category: "Duplicate Detection",
        severity: "warning",
        message: `${duplicateTexts.length} duplicate question texts found`,
        data: duplicateQuestions.map((q: Question) => ({ 
          id: q.id, 
          question_text: q.question_text,
          grammar_type: q.grammar_type 
        }))
      })
    }

    // 5. 문법 유형 일관성 검사
    const grammarTypes = [...new Set(typedQuestions?.map((q: Question) => q.grammar_type) || [])] as string[]
    const expectedTypes = [
      "Present Simple", "Present Perfect", "Past Simple", "Past Perfect", 
      "Future Tense", "Conditionals", "Passive Voice", "Modal Verbs",
      "Gerunds and Infinitives", "Gerunds", "Infinitives", "Participles",
      "Articles", "Prepositions", "Relative Clauses", "Conjunctions", "Tenses"
    ]
    
    const unknownTypes = grammarTypes.filter((type: string) => !expectedTypes.includes(type))
    if (unknownTypes.length > 0) {
      results.push({
        category: "Grammar Type Validation",
        severity: "warning",
        message: `${unknownTypes.length} unknown grammar types found`,
        data: unknownTypes
      })
    }

    // 6. 난이도 레벨 검증
    const invalidDifficulties = typedQuestions?.filter((q: Question) => 
      !['beginner', 'intermediate', 'advanced'].includes(q.difficulty_level)
    ) || []

    if (invalidDifficulties.length > 0) {
      results.push({
        category: "Difficulty Validation",
        severity: "error",
        message: `${invalidDifficulties.length} questions have invalid difficulty levels`,
        data: invalidDifficulties.map((q: Question) => ({ 
          id: q.id, 
          question_text: q.question_text?.substring(0, 50) + "...",
          difficulty_level: q.difficulty_level 
        }))
      })
    }

    // 7. 설명 품질 검사 (너무 짧은 설명)
    const shortExplanations = typedQuestions?.filter((q: Question) => 
      q.explanation && q.explanation.length < 20
    ) || []

    if (shortExplanations.length > 0) {
      results.push({
        category: "Explanation Quality",
        severity: "warning",
        message: `${shortExplanations.length} questions have very short explanations (< 20 characters)`,
        data: shortExplanations.map((q: Question) => ({ 
          id: q.id, 
          question_text: q.question_text?.substring(0, 50) + "...",
          explanation: q.explanation 
        }))
      })
    }

    // 8. 옵션 중복 검사 (같은 문제에서 동일한 선택지)
    const duplicateOptions = typedQuestions?.filter((q: Question) => {
      const options = [q.option_a, q.option_b, q.option_c, q.option_d]
      return options.length !== new Set(options).size
    }) || []

    if (duplicateOptions.length > 0) {
      results.push({
        category: "Option Validation",
        severity: "warning",
        message: `${duplicateOptions.length} questions have duplicate answer options`,
        data: duplicateOptions.map((q: Question) => ({ 
          id: q.id, 
          question_text: q.question_text?.substring(0, 50) + "...",
          options: [q.option_a, q.option_b, q.option_c, q.option_d]
        }))
      })
    }

    // 9. 문법 유형별 문제 분포 통계
    const typeDistribution = grammarTypes.map((type: string) => ({
      type,
      count: typedQuestions?.filter((q: Question) => q.grammar_type === type).length || 0
    }))

    results.push({
      category: "Statistics",
      severity: "info",
      message: `Grammar type distribution`,
      data: typeDistribution.sort((a, b) => b.count - a.count)
    })

    // 10. 난이도별 분포 통계
    const difficultyDistribution = ['beginner', 'intermediate', 'advanced'].map((level: string) => ({
      level,
      count: typedQuestions?.filter((q: Question) => q.difficulty_level === level).length || 0
    }))

    results.push({
      category: "Statistics",
      severity: "info",
      message: `Difficulty level distribution`,
      data: difficultyDistribution
    })

    // 성공 메시지
    if (results.filter(r => r.severity === 'error').length === 0) {
      results.unshift({
        category: "Overall",
        severity: "info",
        message: `✅ Validation completed! ${typedQuestions?.length || 0} questions analyzed with no critical errors.`
      })
    } else {
      results.unshift({
        category: "Overall",
        severity: "error",
        message: `❌ Validation found ${results.filter(r => r.severity === 'error').length} critical errors that need attention.`
      })
    }

    return NextResponse.json({ 
      success: true,
      results,
      summary: {
        totalQuestions: typedQuestions?.length || 0,
        errors: results.filter(r => r.severity === 'error').length,
        warnings: results.filter(r => r.severity === 'warning').length,
        infos: results.filter(r => r.severity === 'info').length
      }
    })

  } catch (error) {
    console.error("Error validating data:", error)
    return NextResponse.json({ error: "Failed to validate data" }, { status: 500 })
  }
}

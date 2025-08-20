// Gemini AI Provider
import { AIProvider, GrammarQuestion, GRAMMAR_TYPE_MAPPING, DIFFICULTY_MAPPING } from './types'

export class GeminiProvider implements AIProvider {
  private apiKey: string

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set")
    }
    this.apiKey = apiKey
  }

  async generateQuestions(
    grammarType: string,
    difficultyLevel: "초급" | "중급" | "고급",
    count: number = 1
  ): Promise<GrammarQuestion[]> {
    const prompt = `너는 G-TELP 문법 출제자야. [문법유형: ${grammarType}], [난이도: ${difficultyLevel}]에 맞는 4지선다형 영어 문법 문제를 ${count}문항 만들어줘. 

문장은 빈칸이 한 곳 있으며, 보기 4개와 정답, 간단한 해설도 함께 제공해줘. 

출력 형식은 아래와 같아:
문제: (빈칸이 있는 영어 문장)
보기: A. B. C. D.
정답: (정답 보기의 알파벳)
해설: (정답이 왜 맞는지 한 문장으로 간단히 설명)
문법유형: ${grammarType}
난이도: ${difficultyLevel}

응답은 반드시 다음과 같은 JSON 배열 형태로만 제공해줘:
[
  {
    "question_text": "She _____ to school every day.",
    "option_a": "go",
    "option_b": "goes", 
    "option_c": "going",
    "option_d": "gone",
    "correct_answer": "B",
    "explanation": "3인칭 단수 주어에는 현재시제 동사에 -s를 붙여 'goes'를 사용합니다.",
    "grammar_type": "${grammarType}",
    "difficulty_level": "${difficultyLevel}"
  }
]

G-TELP 시험 스타일에 맞게 실용적이고 정확한 문제를 만들어줘.`

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 1,
              topP: 1,
              maxOutputTokens: 2048,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Gemini raw response:", data.candidates[0].content.parts[0].text)

      return this.parseResponse(data.candidates[0].content.parts[0].text)
    } catch (error) {
      console.error("Error generating questions with Gemini:", error)
      throw new Error(`Failed to generate G-TELP questions with Gemini: ${error}`)
    }
  }

  private parseResponse(responseText: string): GrammarQuestion[] {
    // Extract JSON from markdown code blocks
    let cleanJsonText = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      cleanJsonText = jsonMatch[1].trim()
    }

    console.log("Raw extracted JSON:", cleanJsonText)

    // Aggressive JSON cleaning to fix escape character issues
    cleanJsonText = this.aggressiveJsonClean(cleanJsonText)

    console.log("Aggressively cleaned JSON:", cleanJsonText)

    let questions: GrammarQuestion[]
    try {
      questions = JSON.parse(cleanJsonText)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Failed JSON text:", cleanJsonText)
      
      // Try manual object reconstruction as last resort
      try {
        questions = this.manualObjectReconstruction(responseText)
        console.log("Manual reconstruction successful!")
      } catch (reconstructError) {
        console.error("Manual reconstruction failed:", reconstructError)
        throw new Error(`Failed to parse JSON from Gemini response: ${parseError}`)
      }
    }

    // Map Korean values to English for database compatibility
    return questions.map(question => ({
      ...question,
      grammar_type: GRAMMAR_TYPE_MAPPING[question.grammar_type] || question.grammar_type,
      difficulty_level: DIFFICULTY_MAPPING[question.difficulty_level] || question.difficulty_level
    })) as GrammarQuestion[]
  }

  private aggressiveJsonClean(text: string): string {
    let cleaned = text
    
    // Fix escaped quotes and backslashes that break JSON
    cleaned = cleaned.replace(/\\"/g, '"')
    cleaned = cleaned.replace(/\\\\/g, '\\')
    
    // Fix broken fields that are split across lines
    cleaned = cleaned.replace(/\\" grammar_type.*?":/g, '", "grammar_type":')
    cleaned = cleaned.replace(/\\" difficulty_level.*?":/g, '", "difficulty_level":')
    
    // Remove problematic escape sequences in explanation fields
    cleaned = cleaned.replace(/"explanation":\s*"([^"]*?)\\[^"]*"/g, (match, explanation) => {
      const cleanExp = explanation.replace(/\\/g, '').trim()
      return `"explanation": "${cleanExp}"`
    })
    
    return cleaned
  }

  private manualObjectReconstruction(text: string): GrammarQuestion[] {
    // Extract individual question data using regex patterns
    const questions: GrammarQuestion[] = []
    
    // Find all question_text occurrences and build objects around them
    const questionPattern = /"question_text":\s*"([^"]+)"/g
    let match
    
    while ((match = questionPattern.exec(text)) !== null) {
      const questionText = match[1]
      const startIndex = match.index
      
      // Find the end of this question object (look for next question or end of array)
      const nextQuestionIndex = text.indexOf('"question_text":', startIndex + 1)
      const endIndex = nextQuestionIndex > 0 ? nextQuestionIndex : text.length
      const questionBlock = text.substring(startIndex - 50, endIndex)
      
      // Extract fields using simple regex
      const rawQuestion: GrammarQuestion = {
        question_text: questionText,
        option_a: this.extractFieldValue(questionBlock, 'option_a') || '',
        option_b: this.extractFieldValue(questionBlock, 'option_b') || '',
        option_c: this.extractFieldValue(questionBlock, 'option_c') || '',
        option_d: this.extractFieldValue(questionBlock, 'option_d') || '',
        correct_answer: this.extractFieldValue(questionBlock, 'correct_answer') as 'A' | 'B' | 'C' | 'D' || 'A',
        explanation: this.extractFieldValue(questionBlock, 'explanation') || '',
        grammar_type: this.extractFieldValue(questionBlock, 'grammar_type') || '',
        difficulty_level: this.extractFieldValue(questionBlock, 'difficulty_level') as "초급" | "중급" | "고급" || '초급'
      }
      
      // Apply mapping for database compatibility
      const mappedQuestion = {
        ...rawQuestion,
        grammar_type: GRAMMAR_TYPE_MAPPING[rawQuestion.grammar_type] || rawQuestion.grammar_type,
        difficulty_level: DIFFICULTY_MAPPING[rawQuestion.difficulty_level] || rawQuestion.difficulty_level
      } as GrammarQuestion
      
      questions.push(mappedQuestion)
    }
    
    if (questions.length === 0) {
      throw new Error("No questions found in manual reconstruction")
    }
    
    return questions
  }

  private extractFieldValue(text: string, fieldName: string): string {
    const pattern = new RegExp(`"${fieldName}":\\s*"([^"]*)"`)
    const match = text.match(pattern)
    return match ? match[1] : ''
  }

  private cleanJsonText(text: string): string {
    // 기존 Gemini.ts의 모든 JSON 정리 로직을 여기에 이식
    // 브루트포스 quote 정규화
    let cleanJsonText = text.replace(/'/g, '"')

    console.log("After quote normalization:", cleanJsonText)

    // Step 1: Fix the most common mixed quote patterns first
    cleanJsonText = cleanJsonText
      // At this point all quotes should be double quotes, just fix spacing and structure
      .replace(/"([a-z_]+)"\s*:\s*"([^"]*?)"/g, '"$1": "$2"')
      // Fix embedded quotes in explanation strings - escape them with space handling
      .replace(/"explanation":\s*"([^"]*?)\s*"([^"]+?)"\s*([^"]*?)\s*"([^"]+?)"\s*([^"]*?)"(\s*[,}])/g, '"explanation": "$1 \\"$2\\" $3 \\"$4\\" $5"$6')
      .replace(/"explanation":\s*"([^"]*?)\s*"([^"]+?)"\s*([^"]*?)\s*"([^"]+?)"\s*([^"]*?)"(\s*[,}])/g, '"explanation": "$1 \\"$2\\" $3 \\"$4\\" $5"$6')
      .replace(/"explanation":\s*"([^"]*?)\s*"([^"]+?)"\s*([^"]*?)"(\s*[,}])/g, '"explanation": "$1 \\"$2\\" $3"$4')
      .replace(/"explanation":\s*"([^"]*)"([^"]*)"([^"]*)"([^"]*)"(\s*[,}])/g, '"explanation": "$1\\"$2\\"$3\\"$4"$5')
      .replace(/"explanation":\s*"([^"]*)"([^"]*)"([^"]*)"(\s*[,}])/g, '"explanation": "$1\\"$2\\"$3"$4')
      .replace(/"explanation":\s*"([^"]*)"([^"]*)"(\s*[,}])/g, '"explanation": "$1\\"$2"$3')
      // Fix any remaining property syntax issues
      .replace(/"\s*([a-z_]+)\s*":/g, '"$1":')
      .replace(/:\s*"/g, ': "')
      // Fix contractions
      .replace(/doesn"t/g, "doesn't")
      .replace(/won"t/g, "won't")
      .replace(/can"t/g, "can't")
      .replace(/wouldn"t/g, "wouldn't")
      .replace(/couldn"t/g, "couldn't")
      // Clean up whitespace
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*([}\]])/g, '$1')

    return cleanJsonText
  }

  private fallbackParse(cleanJsonText: string, parseError: Error): GrammarQuestion[] {
    console.log("Attempting fallback parsing...")
    
    // Try to extract individual objects
    try {
      const objectMatches = cleanJsonText.match(/\{[^{}]*"question_text"[^{}]*\}/g)
      if (objectMatches && objectMatches.length > 0) {
        console.log("Found individual objects:", objectMatches)
        return objectMatches.map((obj: string) => JSON.parse(obj))
      }
    } catch (error) {
      console.error("Fallback parsing failed:", error)
    }
    
    throw new Error(`Failed to parse JSON from Gemini response after all attempts: ${parseError}`)
  }
}

// LM Studio Local AI Provider
import { AIProvider, GrammarQuestion, GRAMMAR_TYPE_MAPPING, DIFFICULTY_MAPPING } from './types'
import { getSelectedModel } from './model-state'

export class LMStudioProvider implements AIProvider {
  private apiBase: string
  private modelName: string
  private lastModelCheck: number = 0
  private modelCheckInterval: number = 30000 // 30초마다 모델 확인

  constructor(customModel?: string) {
    const apiBase = process.env.LMSTUDIO_API_BASE
    if (!apiBase) {
      throw new Error("LMSTUDIO_API_BASE environment variable is not set")
    }
    this.apiBase = apiBase
    
    // 우선순위: customModel > 전역 선택된 모델 > 환경변수 > 기본값
    this.modelName = customModel || getSelectedModel() || process.env.LMSTUDIO_MODEL_NAME || "local-model"
    
    // 초기화 시 모델 감지 시도
    this.detectModel()
  }

  // 모델 변경 메서드
  setModel(modelName: string): void {
    this.modelName = modelName
    console.log(`🔄 LM Studio 모델 변경: ${modelName}`)
  }

  async generateQuestions(
    grammarType: string,
    difficultyLevel: "초급" | "중급" | "고급",
    count: number = 1
  ): Promise<GrammarQuestion[]> {
    // 주기적으로 모델 상태 확인
    await this.checkAndUpdateModel()

    const prompt = `너는 G-TELP 문법 출제자야. [문법유형: ${grammarType}], [난이도: ${difficultyLevel}]에 맞는 4지선다형 영어 문법 문제를 ${count}문항 만들어줘. 

문장은 빈칸이 한 곳 있으며, 보기 4개와 정답, 자세한 해설도 함께 제공해줘. 

출력 형식은 아래와 같아:
문제: (빈칸이 있는 영어 문장)
보기: A. B. C. D.
정답: (정답 보기의 알파벳)
해설: (정답이 왜 맞는지와 다른 선택지들이 왜 틀렸는지 설명. 관련 문법 규칙과 예시 문장도 포함)
문법유형: ${grammarType}
난이도: ${difficultyLevel}

해설 작성 요구사항:
1. 정답인 이유를 명확히 설명
2. 다른 선택지가 틀린 이유도 각각 설명
3. 관련 문법 규칙이나 패턴 설명
4. 비슷한 예시 문장 1-2개 제시
5. 학습자가 실수할 수 있는 포인트 언급

난이도별 기준:
- 초급: 기본적인 문법 규칙 (현재시제, 과거시제, 단순한 전치사 등)
- 중급: 복합적인 문법 구조 (완료시제, 가정법, 관계사 등)
- 고급: 미묘한 차이, 고급 문법 구조, 관용적 표현

응답은 반드시 다음과 같은 JSON 배열 형태로만 제공해줘:
[
  {
    "question_text": "She _____ to school every day.",
    "option_a": "go",
    "option_b": "goes", 
    "option_c": "going",
    "option_d": "gone",
    "correct_answer": "B",
    "explanation": "정답은 B입니다. 3인칭 단수 주어 'She'에는 현재시제 동사에 -s를 붙여 'goes'를 사용합니다. A 'go'는 1인칭, 2인칭, 복수주어에 사용됩니다. C 'going'은 현재진행형이나 동명사로 사용되어 여기서는 부적절합니다. D 'gone'은 과거분사로 완료시제에 사용됩니다. 예시: 'He goes to work by bus.', 'They go home together.'",
    "grammar_type": "${grammarType}",
    "difficulty_level": "${difficultyLevel}"
  }
]

G-TELP 시험 스타일에 맞게 실용적이고 정확한 문제를 만들어줘. 해설은 학습자가 완전히 이해할 수 있도록 자세히 작성해줘.`

    try {
      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: "system",
              content: "You are an expert G-TELP English grammar question creator. You must respond with ONLY a valid JSON array containing grammar questions. No explanations, no thinking process, no markdown code blocks, no extra text. Just pure JSON array starting with [ and ending with ]."
            },
            {
              role: "user", 
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2048, // 토큰 수 증가로 더 자세한 해설 생성
          stream: false
        }),
        // 타임아웃 설정 추가 (60초)
        signal: AbortSignal.timeout(60000)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`LM Studio API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log("LM Studio raw response:", data.choices[0].message.content)

      return this.parseResponse(data.choices[0].message.content)
    } catch (error) {
      console.error("Error generating questions with LM Studio:", error)
      throw new Error(`Failed to generate questions with LM Studio: ${error}`)
    }
  }

  private async checkAndUpdateModel(): Promise<void> {
    const now = Date.now()
    
    // 마지막 확인으로부터 충분한 시간이 지났을 때만 확인
    if (now - this.lastModelCheck < this.modelCheckInterval) {
      return
    }

    try {
      const modelsResponse = await fetch(`${this.apiBase}/models`, {
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      })
      
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        if (modelsData.data && modelsData.data.length > 0) {
          const newModelName = modelsData.data[0].id
          
          // 모델이 변경되었는지 확인
          if (newModelName !== this.modelName) {
            console.log(`🔄 LM Studio model changed: ${this.modelName} → ${newModelName}`)
            this.modelName = newModelName
          }
        }
      }
    } catch (error) {
      console.warn("Could not check LM Studio models:", error)
    } finally {
      this.lastModelCheck = now
    }
  }

  private async detectModel(): Promise<void> {
    try {
      const modelsResponse = await fetch(`${this.apiBase}/models`)
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        if (modelsData.data && modelsData.data.length > 0) {
          this.modelName = modelsData.data[0].id
          console.log("Using LM Studio model:", this.modelName)
        }
      }
    } catch (error) {
      console.warn("Could not fetch models from LM Studio, using default:", this.modelName)
    }
  }

  // 수동으로 모델 정보 새로고침
  async refreshModel(): Promise<string | null> {
    try {
      const response = await fetch(`${this.apiBase}/models`, {
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        throw new Error(`LM Studio API 오류: ${response.status}`)
      }
      
      const data = await response.json()
      const newModel = data.data?.[0]?.id
      
      if (newModel) {
        this.modelName = newModel
        console.log(`🔄 LM Studio 모델 수동 업데이트: ${newModel}`)
      }
      
      return newModel || null
      
    } catch (error) {
      console.error('LM Studio 모델 새로고침 실패:', error)
      throw error
    }
  }

  // 현재 모델 정보 반환
  getCurrentModel(): string {
    return this.modelName
  }

  // 모델 목록 조회
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiBase}/models`, {
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        throw new Error(`LM Studio API 오류: ${response.status}`)
      }
      
      const data = await response.json()
      return data.data?.map((model: any) => model.id) || []
      
    } catch (error) {
      console.error('LM Studio 모델 목록 조회 실패:', error)
      return []
    }
  }

  private parseResponse(responseText: string): GrammarQuestion[] {
    let cleanText = responseText.trim()
    
    // Remove thinking tags that DeepSeek models often include
    cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    
    // Remove markdown code blocks if present
    const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      cleanText = jsonMatch[1].trim()
    }

    // Additional cleanup for DeepSeek models
    cleanText = cleanText.replace(/^[^[\{]*/, '').replace(/[^}\]]*$/, '').trim()

    console.log("LM Studio extracted JSON:", cleanText)

    // Apply aggressive JSON cleaning similar to Gemini provider
    cleanText = this.aggressiveJsonClean(cleanText)

    try {
      const questions = JSON.parse(cleanText)
      return this.processQuestions(questions)
    } catch (error) {
      console.error("LM Studio JSON parse error:", error)
      
      // Enhanced fallback parsing
      try {
        // Try manual object reconstruction as last resort
        const questions = this.manualObjectReconstruction(cleanText)
        return this.processQuestions(questions)
      } catch (secondError) {
        console.error("LM Studio manual reconstruction failed:", secondError)
      }
      
      throw new Error(`Failed to parse LM Studio response: ${error}`)
    }
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
    
    // Fix common JSON formatting issues
    cleaned = cleaned.replace(/,\s*]/g, ']')
    cleaned = cleaned.replace(/,\s*}/g, '}')
    
    return cleaned
  }

  private manualObjectReconstruction(text: string): any[] {
    const questions: any[] = []
    
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
      const question = {
        question_text: questionText,
        option_a: this.extractFieldValue(questionBlock, 'option_a') || '',
        option_b: this.extractFieldValue(questionBlock, 'option_b') || '',
        option_c: this.extractFieldValue(questionBlock, 'option_c') || '',
        option_d: this.extractFieldValue(questionBlock, 'option_d') || '',
        correct_answer: this.extractFieldValue(questionBlock, 'correct_answer') || 'A',
        explanation: this.extractFieldValue(questionBlock, 'explanation') || '',
        grammar_type: this.extractFieldValue(questionBlock, 'grammar_type') || '',
        difficulty_level: this.extractFieldValue(questionBlock, 'difficulty_level') || '초급'
      }
      
      questions.push(question)
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

  private processQuestions(questions: any[]): GrammarQuestion[] {
    return questions.map(question => {
      // Fix correct_answer format (extract first character from "D|A|C|B" format)
      let correctAnswer = question.correct_answer
      if (typeof correctAnswer === 'string' && correctAnswer.includes('|')) {
        correctAnswer = correctAnswer.split('|')[0].trim()
      }
      
      return {
        ...question,
        correct_answer: correctAnswer,
        grammar_type: GRAMMAR_TYPE_MAPPING[question.grammar_type] || question.grammar_type,
        difficulty_level: DIFFICULTY_MAPPING[question.difficulty_level] || question.difficulty_level
      } as GrammarQuestion
    })
  }
}

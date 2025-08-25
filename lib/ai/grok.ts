// Grok AI Provider
import { AIProvider, GrammarQuestion } from './types'

export class GrokProvider implements AIProvider {
  private apiKey: string

  constructor() {
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) {
      throw new Error("GROK_API_KEY environment variable is not set")
    }
    this.apiKey = apiKey
  }

  async generateQuestions(
    grammarType: string,
    difficultyLevel: "초급" | "중급" | "고급",
    count: number = 1
  ): Promise<GrammarQuestion[]> {
    const prompt = `영어 문법 문제를 ${count}개 생성해주세요.

요구사항:
- 문법 유형: ${grammarType}
- 난이도: ${difficultyLevel}
- 객관식 4지선다 문제
- 한국어 설명 포함
- 반드시 "이미 존재하는 문제와 중복되지 않게" 새로운 문제를 만들어야 합니다. 기존에 출제된 문제와 동일하거나 유사한 문장은 절대 사용하지 마세요.

반드시 JSON 형식으로만 응답해주세요:
[
  {
    "question_text": "영어 문제 텍스트 (빈칸 _____로 표시)",
    "option_a": "선택지 A",
    "option_b": "선택지 B", 
    "option_c": "선택지 C",
    "option_d": "선택지 D",
    "correct_answer": "A",
    "explanation": "한국어 문법 설명",
    "grammar_type": "${grammarType}",
    "difficulty_level": "${difficultyLevel}"
  }
]`

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are an expert English grammar teacher who creates Korean-language explanations for English grammar questions. Always respond with valid JSON format only."
            },
            {
              role: "user", 
              content: prompt
            }
          ],
          model: "grok-beta",
          temperature: 0.7,
          max_tokens: 2048
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Grok API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Grok raw response:", data.choices[0].message.content)

      return this.parseResponse(data.choices[0].message.content)
    } catch (error) {
      console.error("Error generating questions with Grok:", error)
      throw new Error(`Failed to generate questions with Grok: ${error}`)
    }
  }

  private parseResponse(responseText: string): GrammarQuestion[] {
    // Extract JSON from response
    let cleanJsonText = responseText.trim()
    
    // Remove markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      cleanJsonText = jsonMatch[1].trim()
    }

    console.log("Grok extracted JSON:", cleanJsonText)

    try {
      return JSON.parse(cleanJsonText)
    } catch (error) {
      console.error("Grok JSON parse error:", error)
      throw new Error(`Failed to parse Grok response: ${error}`)
    }
  }
}

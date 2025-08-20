// AI Provider abstraction layer
export interface GrammarQuestion {
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

export interface AIProvider {
  generateQuestions(grammarType: string, difficultyLevel: string, count: number): Promise<GrammarQuestion[]>
}

// Gemini AI Provider
export class GeminiProvider implements AIProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateQuestions(grammarType: string, difficultyLevel: string, count: number): Promise<GrammarQuestion[]> {
    const prompt = `영어 문법 문제를 ${count}개 생성해주세요.

요구사항:
- 문법 유형: ${grammarType}
- 난이도: ${difficultyLevel}
- 객관식 4지선다 문제
- 한국어 설명 포함

JSON 형식으로만 응답해주세요:
[
  {
    "question_text": "영어 문제 텍스트",
    "option_a": "선택지 A",
    "option_b": "선택지 B", 
    "option_c": "선택지 C",
    "option_d": "선택지 D",
    "correct_answer": "A|B|C|D",
    "explanation": "한국어 문법 설명",
    "grammar_type": "${grammarType}",
    "difficulty_level": "${difficultyLevel}"
  }
]`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    console.log("Gemini raw response:", data.candidates[0].content.parts[0].text)

    return this.parseResponse(data.candidates[0].content.parts[0].text)
  }

  private parseResponse(responseText: string): GrammarQuestion[] {
    // Extract JSON from markdown code blocks
    let cleanJsonText = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      cleanJsonText = jsonMatch[1].trim()
    }

    console.log("Raw extracted JSON:", cleanJsonText)

    // Apply the comprehensive JSON cleaning logic from the original gemini.ts
    // (This would include all the quote normalization and cleaning logic)
    
    // For now, use a simplified version - in production, move the full cleaning logic here
    try {
      return JSON.parse(cleanJsonText)
    } catch (error) {
      throw new Error(`Failed to parse Gemini response: ${error}`)
    }
  }
}

// Grok AI Provider
export class GrokProvider implements AIProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateQuestions(grammarType: string, difficultyLevel: string, count: number): Promise<GrammarQuestion[]> {
    const prompt = `영어 문법 문제를 ${count}개 생성해주세요.

요구사항:
- 문법 유형: ${grammarType}
- 난이도: ${difficultyLevel}
- 객관식 4지선다 문제
- 한국어 설명 포함

반드시 JSON 형식으로만 응답해주세요:
[
  {
    "question_text": "영어 문제 텍스트",
    "option_a": "선택지 A",
    "option_b": "선택지 B", 
    "option_c": "선택지 C",
    "option_d": "선택지 D",
    "correct_answer": "A|B|C|D",
    "explanation": "한국어 문법 설명",
    "grammar_type": "${grammarType}",
    "difficulty_level": "${difficultyLevel}"
  }
]`

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

// Factory function to create the appropriate AI provider
export function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'gemini'
  
  if (provider === 'grok') {
    const apiKey = process.env.GROK_API_KEY
    if (!apiKey) {
      throw new Error('GROK_API_KEY is not configured')
    }
    return new GrokProvider(apiKey)
  } else {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    return new GeminiProvider(apiKey)
  }
}

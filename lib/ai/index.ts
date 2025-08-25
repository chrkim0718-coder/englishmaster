// AI Provider Factory and Main Interface
import { AIProvider, GrammarQuestion } from './types'
import { GeminiProvider } from './gemini'
import { GrokProvider } from './grok'
import { LMStudioProvider } from './lmstudio'

export type { GrammarQuestion } from './types'

// Factory function to create the appropriate AI provider
export function createAIProvider(providerName?: string, customModel?: string, customApiBase?: string): AIProvider {
  const provider = providerName || process.env.AI_PROVIDER || 'gemini'
  switch (provider) {
    case 'grok':
      return new GrokProvider()
    case 'lmstudio':
      return new LMStudioProvider(customModel, customApiBase)
    case 'gemini':
    default:
      return new GeminiProvider()
  }
}

// Main function for generating grammar questions
export async function generateGrammarQuestions(
  grammarType: string,
  difficultyLevel: "초급" | "중급" | "고급",
  count: number = 1,
  providerName?: string,
  customApiBase?: string
): Promise<GrammarQuestion[]> {
  const provider = createAIProvider(providerName, undefined, customApiBase)
  return await provider.generateQuestions(grammarType, difficultyLevel, count)
}

// LM Studio 모델 관리 함수들
export async function refreshLMStudioModel(customApiBase?: string): Promise<string | null> {
  const provider = createAIProvider('lmstudio', undefined, customApiBase)
  if ('refreshModel' in provider && provider.refreshModel) {
    return await provider.refreshModel()
  }
  throw new Error('LM Studio provider not available')
}

export function getCurrentLMStudioModel(customApiBase?: string): string {
  const provider = createAIProvider('lmstudio', undefined, customApiBase)
  if ('getCurrentModel' in provider && provider.getCurrentModel) {
    return provider.getCurrentModel()
  }
  throw new Error('LM Studio provider not available')
}

export async function getAvailableLMStudioModels(customApiBase?: string): Promise<string[]> {
  const provider = createAIProvider('lmstudio', undefined, customApiBase)
  if ('getAvailableModels' in provider && provider.getAvailableModels) {
    return await provider.getAvailableModels()
  }
  throw new Error('LM Studio provider not available')
}

// LM Studio 모델 설정 함수
export function setLMStudioModel(modelName: string, customApiBase?: string): AIProvider {
  const provider = createAIProvider('lmstudio', modelName, customApiBase)
  return provider
}

// 특정 모델로 질문 생성
export async function generateQuestionsWithModel(
  grammarType: string,
  difficultyLevel: "초급" | "중급" | "고급",
  count: number = 1,
  modelName?: string,
  customApiBase?: string
): Promise<GrammarQuestion[]> {
  const provider = createAIProvider('lmstudio', modelName, customApiBase)
  return await provider.generateQuestions(grammarType, difficultyLevel, count)
}

// Export individual providers for direct use if needed
export { GeminiProvider } from './gemini'
export { GrokProvider } from './grok'

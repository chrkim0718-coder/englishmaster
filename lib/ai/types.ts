// 문법유형에서 괄호 및 괄호 안 세부 설명 제거 (대분류만 반환)
export function normalizeGrammarType(type: string): string {
  return type.split('(')[0].trim();
}
// Common types and interfaces for all AI providers
export interface GrammarQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: "A" | "B" | "C" | "D"
  explanation: string
  grammar_type: string
  difficulty_level: "초급" | "중급" | "고급"
}

export interface AIProvider {
  generateQuestions(
    grammarType: string,
    difficultyLevel: "초급" | "중급" | "고급",
    count: number
  ): Promise<GrammarQuestion[]>
  // LM Studio 전용 메서드들 (선택적)
  refreshModel?(): Promise<string | null>
  getCurrentModel?(): string
  getAvailableModels?(): Promise<string[]>
  setModel?(modelName: string): void
}

export const GRAMMAR_TYPES = [
  "랜덤", // 모든 유형에서 랜덤 출제
  "가정법", "관계사", "동명사", "부정사", "분사", 
  "수동태", "시제", "전치사", "접속사", "조동사"
] as const

// 한국어 → 영어 매핑
export const GRAMMAR_TYPE_MAPPING: Record<string, string> = {
  "가정법": "Conditionals",
  "관계사": "Relative Clauses", 
  "동명사": "Gerunds",
  "부정사": "Infinitives",
  "분사": "Participles",
  "수동태": "Passive Voice",
  "시제": "Tenses",
  "전치사": "Prepositions", 
  "접속사": "Conjunctions",
  "조동사": "Modal Verbs",
  // 기존 영어 타입도 지원
  "Present Simple": "Present Simple",
  "Present Perfect": "Present Perfect",
  "Conditionals": "Conditionals",
  "Passive Voice": "Passive Voice",
  "Modal Verbs": "Modal Verbs",
}

// 영어 → 한국어 매핑 
export const REVERSE_GRAMMAR_TYPE_MAPPING: Record<string, string> = {
  "Conditionals": "가정법",
  "Relative Clauses": "관계사",
  "Gerunds": "동명사", 
  "Infinitives": "부정사",
  "Participles": "분사",
  "Passive Voice": "수동태",
  "Tenses": "시제",
  "Prepositions": "전치사",
  "Conjunctions": "접속사", 
  "Modal Verbs": "조동사",
  "Present Simple": "현재 시제",
  "Present Perfect": "현재 완료",
}

// 난이도 매핑
export const DIFFICULTY_MAPPING: Record<string, string> = {
  "초급": "beginner",
  "중급": "intermediate", 
  "고급": "advanced",
  // 기존 영어도 지원
  "beginner": "beginner",
  "intermediate": "intermediate",
  "advanced": "advanced",
}

export const REVERSE_DIFFICULTY_MAPPING: Record<string, string> = {
  "beginner": "초급",
  "intermediate": "중급",
  "advanced": "고급",
}

export type GrammarType = typeof GRAMMAR_TYPES[number]
export type DifficultyLevel = "초급" | "중급" | "고급"

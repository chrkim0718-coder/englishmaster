// LM Studio 모델 상태 관리
let currentSelectedModel: string | null = null

export function setSelectedModel(modelName: string): void {
  currentSelectedModel = modelName
  console.log(`🔄 전역 LM Studio 모델 설정: ${modelName}`)
}

export function getSelectedModel(): string | null {
  return currentSelectedModel
}

export function clearSelectedModel(): void {
  currentSelectedModel = null
  console.log('🗑️ 전역 LM Studio 모델 설정 초기화')
}

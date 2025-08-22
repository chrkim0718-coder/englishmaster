// 문제 1개만 받아오는 API 호출 유틸리티 (임시)
export async function fetchSingleQuestion(grammarType: string, difficulty: string) {
  const url = `/api/questions?grammarType=${encodeURIComponent(grammarType)}&difficultyLevel=${difficulty}&limit=1`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !data.questions || data.questions.length === 0) {
    throw new Error("문제를 불러올 수 없습니다.");
  }
  return data.questions[0];
}

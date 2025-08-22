// 여러 문제 받아오는 유틸리티
export async function fetchGameQuestions(grammarType: string, difficulty: string, count: number) {
  const url = `/api/questions?grammarType=${encodeURIComponent(grammarType)}&difficultyLevel=${difficulty}&limit=${count}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !data.questions || data.questions.length === 0) {
    throw new Error("문제를 불러올 수 없습니다.");
  }
  return data.questions;
}

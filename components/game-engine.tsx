import React from "react";
import { Button } from "@/components/ui/button";

export default function GameEngine({ onExit }: { onExit: () => void }) {
  // 간단한 MVP: 랜덤 점수와 결과만 보여주는 예시
  const [score, setScore] = React.useState<number|null>(null);
  const [finished, setFinished] = React.useState(false);

  function startGame() {
    // 0~100점 랜덤
    setScore(Math.floor(Math.random() * 101));
    setFinished(true);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-2xl font-bold mb-6">🎮 Mini Game Engine (MVP)</div>
      {!finished ? (
        <Button className="w-40 h-12 bg-green-600 hover:bg-green-700 text-white text-lg font-medium mb-4" onClick={startGame}>
          게임 시작
        </Button>
      ) : (
        <div className="mb-4 text-xl font-semibold text-blue-700">
          결과 점수: {score}점<br/>
          {score !== null && (score > 50 ? "성공!" : "실패!")}
        </div>
      )}
      <Button className="w-40 h-12 bg-gray-600 hover:bg-gray-700 text-white text-lg font-medium" onClick={onExit}>
        돌아가기
      </Button>
    </div>
  );
}

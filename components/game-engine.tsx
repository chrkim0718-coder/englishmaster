import React from "react";
import { Button } from "@/components/ui/button";

// ATB Battle MVP: 게이지 자동 충전, 공격 버튼, HP, 승리/패배
export default function GameEngine({ onExit }: { onExit: () => void }) {
  const [playerHp, setPlayerHp] = React.useState(100);
  const [enemyHp, setEnemyHp] = React.useState(100);
  const [atb, setAtb] = React.useState(0); // 0~100
  const [isAttacking, setIsAttacking] = React.useState(false);
  const [battleEnd, setBattleEnd] = React.useState<string|null>(null);

  // ATB 게이지 자동 충전
  React.useEffect(() => {
    if (battleEnd) return;
    if (atb >= 100) return;
    const timer = setInterval(() => {
      setAtb((prev) => Math.min(prev + 2, 100));
    }, 40); // 2씩 빠르게 충전
    return () => clearInterval(timer);
  }, [atb, battleEnd]);

  // 공격 버튼 클릭
  const handleAttack = () => {
    if (atb < 100 || isAttacking || battleEnd) return;
    setIsAttacking(true);
    // 랜덤 데미지
    const dmg = Math.floor(Math.random() * 21) + 10; // 10~30
    setTimeout(() => {
      setEnemyHp((hp) => {
        const newHp = Math.max(hp - dmg, 0);
        if (newHp === 0) setBattleEnd("승리!");
        return newHp;
      });
      setAtb(0);
      setIsAttacking(false);
    }, 400);
  };

  // 적이 살아있으면 턴마다 반격
  React.useEffect(() => {
    if (battleEnd) return;
    if (enemyHp === 0) return;
    if (playerHp === 0) return;
    if (enemyHp < 100 && atb === 0) {
      // 적의 반격 (공격 후)
      const timer = setTimeout(() => {
        const dmg = Math.floor(Math.random() * 16) + 5; // 5~20
        setPlayerHp((hp) => {
          const newHp = Math.max(hp - dmg, 0);
          if (newHp === 0) setBattleEnd("패배...");
          return newHp;
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [enemyHp, atb, playerHp, battleEnd]);

  // 재시작
  const handleRestart = () => {
    setPlayerHp(100);
    setEnemyHp(100);
    setAtb(0);
    setBattleEnd(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen select-none">
      <div className="text-2xl font-bold mb-4">⚔️ ATB 배틀 (MVP)</div>
      <div className="flex flex-col items-center w-full max-w-xs mb-6">
        <div className="w-full mb-2">
          <div className="text-sm font-semibold">플레이어 HP: {playerHp}</div>
          <div className="w-full h-3 bg-gray-200 rounded">
            <div className="h-3 bg-green-500 rounded" style={{ width: `${playerHp}%` }} />
          </div>
        </div>
        <div className="w-full mb-2">
          <div className="text-sm font-semibold">적 HP: {enemyHp}</div>
          <div className="w-full h-3 bg-gray-200 rounded">
            <div className="h-3 bg-red-500 rounded" style={{ width: `${enemyHp}%` }} />
          </div>
        </div>
        <div className="w-full mb-2">
          <div className="text-sm font-semibold">ATB 게이지</div>
          <div className="w-full h-3 bg-gray-100 rounded">
            <div className="h-3 bg-blue-400 rounded transition-all duration-200" style={{ width: `${atb}%` }} />
          </div>
        </div>
      </div>
      <Button
        className={`w-40 h-12 text-lg font-medium mb-4 ${atb === 100 && !isAttacking && !battleEnd ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
        onClick={handleAttack}
        disabled={atb < 100 || isAttacking || !!battleEnd}
      >
        {battleEnd ? "공격" : atb === 100 ? "공격!" : "대기 중..."}
      </Button>
      {battleEnd && (
        <div className="mb-4 text-xl font-semibold text-purple-700">{battleEnd}</div>
      )}
      <div className="flex gap-2">
        <Button className="w-32 h-10 bg-gray-600 hover:bg-gray-700 text-white text-base font-medium" onClick={onExit}>
          돌아가기
        </Button>
        <Button className="w-32 h-10 bg-green-600 hover:bg-green-700 text-white text-base font-medium" onClick={handleRestart}>
          다시하기
        </Button>
      </div>
    </div>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";

// ATB Battle MVP: 게이지 자동 충전, 공격 버튼, HP, 승리/패배
// 문제 타입 정의 (QuizInterface와 동일하게)
interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  grammar_type: string;
  difficulty_level: string;
}

const HEROES = [
  { name: "용사1", emoji: "🧑‍🎤", maxHp: 100 },
  { name: "용사2", emoji: "🧑‍🚀", maxHp: 100 },
  { name: "용사3", emoji: "🧑‍🔬", maxHp: 100 },
  { name: "용사4", emoji: "🧑‍🌾", maxHp: 100 },
];
const BOSS = { name: "보스 드래곤", emoji: "🐲", maxHp: 400 };


export default function GameEngine({ onExit, questions }: { onExit: () => void; questions: Question[] }) {
  const [atb, setAtb] = React.useState(0);
  const [atbMaxed, setAtbMaxed] = React.useState(false);
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [selected, setSelected] = React.useState<string|null>(null);
  const [showResult, setShowResult] = React.useState(false);
  const [heroes, setHeroes] = React.useState(HEROES.map(h => ({ ...h, hp: h.maxHp })));
  const [bossHp, setBossHp] = React.useState(BOSS.maxHp);
  const [battleEnd, setBattleEnd] = React.useState<string|null>(null);
  const [lastAttackedHero, setLastAttackedHero] = React.useState<number|null>(null);

  const question = questions[currentIdx];
  const isCorrect = selected && selected === question.correct_answer;

  // ATB 게이지 자동 충전
  React.useEffect(() => {
    if (showResult || battleEnd) return;
    if (atb >= 100) return;
    const timer = setInterval(() => {
      setAtb((prev) => {
        const next = Math.min(prev + 2, 100);
        if (next === 100) setAtbMaxed(true);
        return next;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [atb, showResult, battleEnd]);

  // ATB가 100%에 도달하면 atbMaxed true
  React.useEffect(() => {
    if (atb >= 100) setAtbMaxed(true);
  }, [atb]);

  // 답 선택
  const handleSelect = (option: string) => {
    if (showResult || battleEnd) return;
    setSelected(option);
    setShowResult(true);

    if (option === question.correct_answer) {
      // 맞히면 보스 HP 감소
      setTimeout(() => {
        setBossHp(hp => {
          const newHp = Math.max(hp - 80, 0);
          if (newHp === 0) setBattleEnd("🎉 승리! 보스를 물리쳤다!");
          return newHp;
        });
      }, 600);
    } else {
      // 틀리면 용사 중 한 명 랜덤 공격
      setTimeout(() => {
        setHeroes(prev => {
          const alive = prev.map((h, i) => ({ ...h, idx: i })).filter(h => h.hp > 0);
          if (alive.length === 0) return prev;
          const target = alive[Math.floor(Math.random() * alive.length)];
          setLastAttackedHero(target.idx);
          const newArr = prev.map((h, i) =>
            i === target.idx ? { ...h, hp: Math.max(h.hp - 50, 0) } : h
          );
          if (newArr.every(h => h.hp === 0)) setBattleEnd("패배... 용사 전원 쓰러짐");
          return newArr;
        });
      }, 600);
    }
  };

  // 다음 라운드
  const handleNext = () => {
    setAtb(0);
    setAtbMaxed(false);
    setSelected(null);
    setShowResult(false);
    setLastAttackedHero(null);
    setCurrentIdx(idx => idx + 1);
  };

  // 다시하기
  const handleRestart = () => {
    setAtb(0);
    setAtbMaxed(false);
    setSelected(null);
    setShowResult(false);
    setCurrentIdx(0);
    setHeroes(HEROES.map(h => ({ ...h, hp: h.maxHp })));
    setBossHp(BOSS.maxHp);
    setBattleEnd(null);
    setLastAttackedHero(null);
  };

  // 게임 종료 조건
  React.useEffect(() => {
    if (battleEnd) return;
    if (bossHp === 0) setBattleEnd("🎉 승리! 보스를 물리쳤다!");
    if (heroes.every(h => h.hp === 0)) setBattleEnd("패배... 용사 전원 쓰러짐");
  }, [bossHp, heroes, battleEnd]);

  // 문제 끝났을 때
  React.useEffect(() => {
    if (currentIdx >= questions.length && !battleEnd) {
      if (bossHp > 0) setBattleEnd("패배... 문제 소진");
    }
  }, [currentIdx, questions.length, bossHp, battleEnd]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen select-none">
      <div className="text-2xl font-bold mb-2">⚔️ 용사 vs 보스 ATB 배틀</div>
      {/* 보스 */}
      <div className="flex flex-col items-center mb-4">
        <span className="text-4xl">{BOSS.emoji}</span>
        <div className="font-semibold text-lg">{BOSS.name}</div>
        <div className="w-48 h-3 bg-gray-200 rounded mb-1 mt-1">
          <div className="h-3 bg-red-500 rounded" style={{ width: `${(bossHp/BOSS.maxHp)*100}%` }} />
        </div>
        <div className="text-xs text-gray-700">HP: {bossHp} / {BOSS.maxHp}</div>
      </div>
      {/* 용사들 */}
      <div className="flex gap-3 mb-6">
        {heroes.map((h, i) => (
          <div key={h.name} className={`flex flex-col items-center ${lastAttackedHero===i ? "animate-pulse" : ""}`}>
            <span className="text-3xl">{h.emoji}</span>
            <div className="text-xs font-semibold">{h.name}</div>
            <div className="w-16 h-2 bg-gray-200 rounded mt-1">
              <div className="h-2 rounded" style={{ width: `${(h.hp/h.maxHp)*100}%`, background: h.hp>0?"#22c55e":"#aaa" }} />
            </div>
            <div className="text-[10px] text-gray-700">{h.hp} / {h.maxHp}</div>
          </div>
        ))}
      </div>
      {/* 문제 */}
      {battleEnd ? (
        <div className="mb-6 text-xl font-bold text-purple-700">{battleEnd}</div>
      ) : (
        <div className="w-full max-w-md bg-white rounded shadow p-6 mb-6">
          <div className="mb-4 text-lg font-semibold">{question.question_text}</div>
          <div className="mb-4">
            <div className="text-sm font-semibold mb-1">ATB 게이지</div>
            <div className="w-full h-3 bg-gray-100 rounded">
              <div className="h-3 bg-blue-400 rounded transition-all duration-200" style={{ width: `${atb}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {["A", "B", "C", "D"].map((option) => {
              const optionText = question[`option_${option.toLowerCase()}` as keyof Question] as string;
              let btnClass = "p-4 text-left rounded-lg border-2 transition-all ";
              if (showResult) {
                if (option === question.correct_answer) {
                  btnClass += "border-green-500 bg-green-50 text-green-800";
                } else if (selected === option) {
                  btnClass += "border-red-500 bg-red-50 text-red-800";
                } else {
                  btnClass += "border-gray-200 bg-gray-50 text-gray-600";
                }
              } else {
                if (selected === option) {
                  btnClass += "border-blue-500 bg-blue-50";
                } else {
                  btnClass += atb === 100 ? "border-gray-200 hover:border-gray-300 hover:bg-gray-50" : "border-gray-100 bg-gray-50 text-gray-400";
                }
              }
              return (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  disabled={showResult}
                  className={btnClass}
                >
                  <span className="font-medium text-blue-600">{option})</span> {optionText}
                </button>
              );
            })}
          </div>
          {showResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="mb-2 font-semibold">
                {isCorrect ? "정답입니다! 🎉" : "오답입니다."}
              </div>
              <div className="text-gray-700">{question.explanation}</div>
            </div>
          )}
          {showResult && currentIdx < questions.length - 1 && (
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleNext}>
              다음 라운드
            </Button>
          )}
        </div>
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

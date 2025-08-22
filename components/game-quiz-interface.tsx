
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface GameQuizInterfaceProps {
  grammarType: string
  difficulty: string
  questionCount: number
  onComplete: () => void
  user: { id: string; email: string }
}

// 무기 종류 (보기별 효과)
const WEAPONS = [
  { name: "Pistol", color: "bg-blue-500", effect: "💥" },
  { name: "RPG", color: "bg-red-500", effect: "🔥" },
  { name: "Laser", color: "bg-green-500", effect: "⚡" },
  { name: "Bomb", color: "bg-yellow-500", effect: "💣" },
]

// 모바일 대응 및 레트로 스타일 적용
export default function GameQuizInterface({ grammarType, difficulty, questionCount, onComplete, user }: GameQuizInterfaceProps) {
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [current, setCurrent] = useState(0)
  const [playerHP, setPlayerHP] = useState(100)
  const [bossHP, setBossHP] = useState(100)
  const [isLoading, setIsLoading] = useState(false)
  const [attackEffect, setAttackEffect] = useState<string | null>(null)
  const [result, setResult] = useState<null | { win: boolean }> (null)

  // 문제 불러오기 (퀴즈 시작 시)
  useEffect(() => {
    if (started && questions.length === 0) {
      setIsLoading(true)
      fetch(`/api/questions?grammarType=${grammarType}&difficultyLevel=${difficulty}&limit=${questionCount}`)
        .then(res => res.json())
        .then(data => {
          setQuestions(data.questions || [])
        })
        .finally(() => setIsLoading(false))
    }
  }, [started])

  // 즉시 채점 및 HP 처리
  function handleAttack(idx: number) {
    if (!questions[current]) return
    const q = questions[current]
    const isCorrect = q.choices[idx] === q.answer
    setAttackEffect(WEAPONS[idx].effect)
    setTimeout(() => {
      setAttackEffect(null)
      if (isCorrect) {
        setBossHP(hp => Math.max(0, hp - 25))
      } else {
        setPlayerHP(hp => Math.max(0, hp - 20))
      }
      // 다음 문제 or 결과
      if (current + 1 < questions.length && bossHP - (isCorrect ? 25 : 0) > 0 && playerHP - (isCorrect ? 0 : 20) > 0) {
        setCurrent(c => c + 1)
      } else {
        // 게임 종료
        setTimeout(() => {
          setResult({ win: bossHP - (isCorrect ? 25 : 0) <= 0 })
        }, 500)
      }
    }, 600)
  }

  // HP 바 컴포넌트
  function HPBar({ label, hp, max, color }: { label: string, hp: number, max: number, color: string }) {
    return (
      <div className="w-full max-w-xs flex flex-col items-start mb-2">
        <span className="text-xs font-bold mb-1">{label} HP: {hp} / {max}</span>
        <div className="w-full h-4 bg-gray-300 rounded overflow-hidden">
          <div className={`${color} h-4 transition-all`} style={{ width: `${(hp / max) * 100}%` }} />
        </div>
      </div>
    )
  }

  // 모바일/PC 모두 대응하는 레이아웃
  if (!started) {
    return (
      <Card className="max-w-xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Game Mode (Retro RPG)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Defeat the Grammar Boss!<br/>Each answer is a weapon.<br/>Correct: Boss HP -<br/>Wrong: Your HP -<br/>Let&apos;s play!</p>
          <Button onClick={() => setStarted(true)} className="bg-green-600 hover:bg-green-700 w-full text-lg py-3">Start Game</Button>
          <Button variant="outline" onClick={onComplete} className="w-full">Back</Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return <div className="flex flex-col items-center justify-center h-64 text-lg">Loading questions...</div>
  }

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <h2 className="text-2xl font-bold mb-4">{result.win ? "Victory!" : "Defeat..."}</h2>
        <p className="mb-6">{result.win ? "You defeated the Grammar Boss!" : "You lost all your HP!"}</p>
        <Button onClick={onComplete} className="bg-blue-600 text-white px-8 py-3 text-lg">Back to Dashboard</Button>
      </div>
    )
  }

  const q = questions[current]

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center p-2 sm:p-6">
      {/* 보스 영역 */}
      <div className="w-full flex flex-col items-center mb-4">
        <div className="flex flex-col items-center w-full">
          <div className="text-lg font-bold mb-1">Grammar Boss</div>
          <img src="/placeholder-logo.png" alt="Boss" className="w-20 h-20 mb-2" />
          <HPBar label="Boss" hp={bossHP} max={100} color="bg-red-500" />
        </div>
      </div>

      {/* 문제 영역 */}
      <div className="w-full bg-gray-100 rounded-lg p-4 mb-4 text-center text-base sm:text-lg font-mono border border-gray-300">
        {q?.question}
      </div>

      {/* 무기(보기) 버튼 */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-6">
        {q?.choices.map((choice: string, idx: number) => (
          <Button
            key={idx}
            className={`w-full py-4 text-base sm:text-lg font-bold flex items-center justify-center gap-2 ${WEAPONS[idx]?.color || 'bg-gray-400'} ${attackEffect && WEAPONS[idx]?.effect === attackEffect ? 'animate-bounce' : ''}`}
            onClick={() => handleAttack(idx)}
            disabled={!!attackEffect}
          >
            {WEAPONS[idx]?.effect || '🔹'} {choice}
          </Button>
        ))}
      </div>

      {/* 플레이어 영역 */}
      <div className="w-full flex flex-col items-center">
        <img src="/placeholder-user.jpg" alt="Player" className="w-16 h-16 mb-2 rounded-full border-2 border-blue-400" />
        <HPBar label="You" hp={playerHP} max={100} color="bg-blue-500" />
      </div>
    </div>
  )
}

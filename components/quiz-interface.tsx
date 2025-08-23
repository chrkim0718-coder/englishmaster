"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: "A" | "B" | "C" | "D"
  explanation: string
  grammar_type: string
  difficulty_level: string
}

interface User {
  id: string
  email: string
}

interface QuizInterfaceProps {
  grammarType: string
  difficulty: string
  questionCount?: number
  scoringMode?: "end" | "immediate"
  onComplete: () => void
  user: User
  isWeaknessQuiz?: boolean
}

export default function QuizInterface({ 
  grammarType, 
  difficulty, 
  questionCount = 10,
  scoringMode = "end",
  onComplete, 
  user,
  isWeaknessQuiz = false
}: QuizInterfaceProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [showQuestionResult, setShowQuestionResult] = useState<Record<number, boolean>>({}) // 즉시 채점 모드용
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [noQuestionsFound, setNoQuestionsFound] = useState(false)
  const [noQuestionsMessage, setNoQuestionsMessage] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      let url: string
      if (grammarType === "랜덤") {
        // 랜덤: 모든 유형에서 균등분할로 문제 요청
        const grammarTypes = [
          "가정법", "관계사", "동명사", "부정사", "분사", "수동태", "시제", "전치사", "접속사", "조동사"
        ];
        const total = Number(questionCount) || 10;
        const perType = Math.floor(total / grammarTypes.length);
        const remainder = total % grammarTypes.length;
  let allQuestions: Question[] = [];
        for (let i = 0; i < grammarTypes.length; i++) {
          // 나머지는 앞에서부터 하나씩 더함
          const count = perType + (i < remainder ? 1 : 0);
          if (count === 0) continue;
          const url = `/api/questions?grammarType=${encodeURIComponent(grammarTypes[i])}&difficultyLevel=${difficulty}&limit=${count}`;
          const response = await fetch(url);
          const data = await response.json();
          if (response.ok && data.questions?.length > 0) {
            allQuestions = allQuestions.concat(data.questions);
          }
        }
        // 문제를 랜덤하게 섞음
        allQuestions = allQuestions.sort(() => Math.random() - 0.5).slice(0, total);
        if (allQuestions.length === 0) {
          toast({
            title: "사용 가능한 문제가 없습니다",
            description: "랜덤 유형에 해당하는 문제가 없습니다.",
            variant: "destructive",
          });
          onComplete();
          return;
        }
        setQuestions(allQuestions);
        return;
      } else if (isWeaknessQuiz) {
        url = `/api/questions/incorrect?grammarType=${encodeURIComponent(grammarType)}&limit=${questionCount}&userId=${user.id}`;
      } else {
        url = `/api/questions?grammarType=${encodeURIComponent(grammarType)}&difficultyLevel=${difficulty}&limit=${questionCount}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data.error || data.message || "Failed to fetch questions";
        throw new Error(errorMessage);
      }
      if (data.questions?.length === 0 || data.total === 0) {
        const message = isWeaknessQuiz
          ? data.message || "이 문법유형에서 틀린 문제가 없습니다. 새로운 문제를 풀어보세요!"
          : "이 문법유형과 난이도에 해당하는 문제가 없습니다. 다른 조합을 시도해보세요.";
        if (isWeaknessQuiz) {
          setNoQuestionsFound(true);
          setNoQuestionsMessage(message);
          setIsLoading(false);
          return;
        } else {
          toast({
            title: "사용 가능한 문제가 없습니다",
            description: message,
            variant: "destructive",
          });
          onComplete();
          return;
        }
      }
      setQuestions(data.questions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to load questions: ${errorMessage}`,
        variant: "destructive",
      });
      onComplete();
    } finally {
      setIsLoading(false);
    }
  }

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: answer,
    }))

    // 즉시 채점 모드인 경우
    if (scoringMode === "immediate") {
      setShowQuestionResult((prev) => ({
        ...prev,
        [currentQuestionIndex]: true,
      }))
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmitQuiz = async () => {
    setIsSaving(true)
    try {
      const score = calculateScore()

      const response = await fetch("/api/quiz-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grammarType,
          difficultyLevel: difficulty,
          questions,
          answers: selectedAnswers,
          score,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save quiz results")
      }

      toast({
        title: isWeaknessQuiz ? "틀린 문제 복습 완료!" : "Quiz Completed!",
        description: isWeaknessQuiz 
          ? `틀린 문제들을 다시 풀어보셨습니다. 점수: ${score.percentage}%`
          : `Your results have been saved. Score: ${score.percentage}%`,
      })
    } catch (error) {
      console.error("Error saving quiz results:", error)
      toast({
        title: "Warning",
        description: "Quiz completed but results could not be saved.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setShowResults(true)
    }
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct_answer) {
        correct++
      }
    })
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    }
  }

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswers({})
    setShowQuestionResult({})
    setShowResults(false)
  }

  // 취약 문제가 없는 경우 축하 화면
  if (noQuestionsFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-green-800">축하합니다! 🎉</h2>
                <p className="text-green-700 leading-relaxed">
                  {noQuestionsMessage}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-green-600">
                  이 문법 유형을 완전히 마스터하셨습니다!
                </p>
                <Button 
                  onClick={onComplete}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  성취도 분석으로 돌아가기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Loading quiz questions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showResults) {
    const score = calculateScore()
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Quiz Results</CardTitle>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {grammarType}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800 capitalize">
                  {difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score Summary */}
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-blue-600">{score.percentage}%</div>
                <p className="text-xl text-gray-600">
                  You got {score.correct} out of {score.total} questions correct
                </p>
                <Progress value={score.percentage} className="w-full max-w-md mx-auto h-3" />
              </div>

              {/* Question Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Question Review</h3>
                {questions.map((question, index) => {
                  const userAnswer = selectedAnswers[index]
                  const isCorrect = userAnswer === question.correct_answer
                  return (
                    <Card
                      key={question.id}
                      className={`border-l-4 ${isCorrect ? "border-l-green-500" : "border-l-red-500"}`}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <p className="font-medium">
                              {index + 1}. {question.question_text}
                            </p>
                            {isCorrect ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {["A", "B", "C", "D"].map((option) => {
                              const optionText = question[`option_${option.toLowerCase()}` as keyof Question] as string
                              const isUserAnswer = userAnswer === option
                              const isCorrectAnswer = question.correct_answer === option
                              return (
                                <div
                                  key={option}
                                  className={`p-2 rounded ${
                                    isCorrectAnswer
                                      ? "bg-green-100 border border-green-500"
                                      : isUserAnswer
                                        ? "bg-red-100 border border-red-500"
                                        : "bg-gray-50"
                                  }`}
                                >
                                  <span className="font-medium">{option})</span> {optionText}
                                </div>
                              )
                            })}
                          </div>
                          <div className="bg-blue-50 p-3 rounded text-sm">
                            <p>
                              <strong>Explanation:</strong> {question.explanation}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <Button onClick={handleRetakeQuiz} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake Quiz
                </Button>
                <Button onClick={onComplete} className="bg-blue-600 hover:bg-blue-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button onClick={onComplete} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              {isWeaknessQuiz && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  틀린 문제 복습
                </Badge>
              )}
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {grammarType}
              </Badge>
              {!isWeaknessQuiz && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 capitalize">
                  {difficulty}
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Question Card */}
        <Card className="shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.question_text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {["A", "B", "C", "D"].map((option) => {
                const optionText = currentQuestion[`option_${option.toLowerCase()}` as keyof Question] as string
                const isSelected = selectedAnswers[currentQuestionIndex] === option
                const showResult = showQuestionResult[currentQuestionIndex]
                const isCorrect = currentQuestion.correct_answer === option
                const isUserAnswer = isSelected
                
                let buttonClass = "p-4 text-left rounded-lg border-2 transition-all "
                
                if (showResult && scoringMode === "immediate") {
                  if (isCorrect) {
                    // 정답은 초록색
                    buttonClass += "border-green-500 bg-green-50 text-green-800"
                  } else if (isUserAnswer && !isCorrect) {
                    // 사용자가 선택한 오답은 빨간색
                    buttonClass += "border-red-500 bg-red-50 text-red-800"
                  } else {
                    // 그 외는 회색
                    buttonClass += "border-gray-200 bg-gray-50 text-gray-600"
                  }
                } else {
                  // 일반 상태
                  if (isSelected) {
                    buttonClass += "border-blue-500 bg-blue-50"
                  } else {
                    buttonClass += "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                }

                return (
                  <button
                    key={option}
                    onClick={() => !showResult && handleAnswerSelect(option)}
                    disabled={showResult && scoringMode === "immediate"}
                    className={buttonClass}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-blue-600">{option})</span> {optionText}
                      </div>
                      {showResult && scoringMode === "immediate" && isCorrect && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {showResult && scoringMode === "immediate" && isUserAnswer && !isCorrect && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 즉시 채점 모드에서 답변 후 해설 표시 */}
            {showQuestionResult[currentQuestionIndex] && scoringMode === "immediate" && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-2">해설</h4>
                <p className="text-gray-700">{currentQuestion.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmitQuiz}
              disabled={Object.keys(selectedAnswers).length !== questions.length || isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? "Saving..." : "Submit Quiz"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!selectedAnswers[currentQuestionIndex]}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

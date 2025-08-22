"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Play, LogOut, Trophy, Target, BarChart3, Plus, Sparkles, Loader2, X } from "lucide-react"
import { signOut } from "@/lib/actions"
import QuizInterface from "@/components/quiz-interface"
import PerformanceDashboard from "@/components/performance-dashboard"
import { GRAMMAR_TYPES, REVERSE_DIFFICULTY_MAPPING } from "@/lib/ai/types"
import { useToast } from "@/hooks/use-toast"

interface QuizDashboardProps {
  user: { id: string; email: string }
}

export default function QuizDashboard({ user }: QuizDashboardProps) {
  // 게임모드로 시작 버튼 핸들러
  function handleStartGameQuiz() {
    // 게임모드 시작 로직: 예시로 alert만 표시
    alert('게임모드로 시작! (여기에 게임모드 로직을 연결하세요)');
  }
  const [selectedGrammarType, setSelectedGrammarType] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("")
  const [selectedQuestionCount, setSelectedQuestionCount] = useState("")
  const [selectedScoringMode, setSelectedScoringMode] = useState("end") // "end" or "immediate"
  const [availableQuestionCount, setAvailableQuestionCount] = useState(0)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateCount, setGenerateCount] = useState("5")
  const [generateEngine, setGenerateEngine] = useState("gemini")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isQuizActive, setIsQuizActive] = useState(false)
  const [showPerformance, setShowPerformance] = useState(false)
  const [isWeaknessQuiz, setIsWeaknessQuiz] = useState(false)
  const [performanceRefreshTrigger, setPerformanceRefreshTrigger] = useState(0)
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    totalQuestions: 0,
  })
  const { toast } = useToast()

  // 문제생성 시스템과 동일한 문법유형 사용
  const grammarTypes = [...GRAMMAR_TYPES]

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/performance")
      const data = await response.json()
      if (data.success) {
        setStats({
          totalQuizzes: data.stats.totalQuizzes,
          averageScore: data.stats.averageScore,
          totalQuestions: data.stats.totalQuestions,
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchAvailableQuestions = async (grammarType: string, difficulty: string) => {
    try {
      const response = await fetch(`/api/questions?grammarType=${grammarType}&difficultyLevel=${difficulty}&count=true`)
      const data = await response.json()
      if (data.success) {
        const count = data.count || 0
        setAvailableQuestionCount(count)
        // 기본값으로 최대 가능한 개수 선택 (최대 20개로 제한)
        setSelectedQuestionCount(Math.min(count, 20).toString())
      }
    } catch (error) {
      console.error("Error fetching available questions:", error)
      setAvailableQuestionCount(0)
      setSelectedQuestionCount("5")
    }
  }

  // 문법유형이나 난이도가 변경될 때마다 사용 가능한 문제 수 조회
  useEffect(() => {
    if (selectedGrammarType && selectedDifficulty) {
      fetchAvailableQuestions(selectedGrammarType, selectedDifficulty)
    } else {
      setAvailableQuestionCount(0)
      setSelectedQuestionCount("")
    }
  }, [selectedGrammarType, selectedDifficulty])

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showGenerateModal) {
        setShowGenerateModal(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showGenerateModal])

  const handleGenerateQuestions = async () => {
    if (!selectedGrammarType || !selectedDifficulty) {
      toast({
        title: "오류",
        description: "문법유형과 난이도를 먼저 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // 영어 난이도를 한글로 변환
      const koreanDifficulty = REVERSE_DIFFICULTY_MAPPING[selectedDifficulty] || selectedDifficulty
      
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grammarType: selectedGrammarType,
          difficultyLevel: koreanDifficulty,
          count: parseInt(generateCount),
          aiProvider: generateEngine,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "성공",
          description: `${generateCount}개의 문제가 성공적으로 생성되었습니다.`,
        })
        
        // 생성 후 사용 가능한 문제 수 새로고침
        await fetchAvailableQuestions(selectedGrammarType, selectedDifficulty)
        setShowGenerateModal(false)
      } else {
        throw new Error(data.error || "문제 생성에 실패했습니다.")
      }
    } catch (error) {
      console.error("Error generating questions:", error)
      toast({
        title: "오류",
        description: `문제 생성에 실패했습니다: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartQuiz = () => {
    console.log('🎮 Starting quiz with:', { 
      selectedGrammarType, 
      selectedDifficulty, 
      selectedQuestionCount,
      selectedScoringMode 
    })
    
    if (!selectedGrammarType) {
      console.log('❌ Grammar type not selected')
      return
    }
    
    if (!selectedDifficulty) {
      console.log('❌ Difficulty not selected')
      return
    }

    if (!selectedQuestionCount) {
      console.log('❌ Question count not selected')
      return
    }
    
    console.log('✅ All selections valid, activating quiz...')
    setIsQuizActive(true)
    console.log('✅ Quiz state set to active!')
  }

  const handleQuizComplete = () => {
    setIsQuizActive(false)
    
    // 취약 문제 퀴즈였다면 Performance Dashboard로 돌아가기
    if (isWeaknessQuiz) {
      setIsWeaknessQuiz(false)
      setShowPerformance(true)
      setSelectedGrammarType("")
      setSelectedDifficulty("")
      setSelectedQuestionCount("")
      setSelectedScoringMode("end")
      setAvailableQuestionCount(0)
      // Performance Dashboard 새로고침 트리거
      setPerformanceRefreshTrigger(prev => prev + 1)
      // Refresh stats after quiz completion
      fetchStats()
      return
    }
    
    // 일반 퀴즈 완료 후 초기 설정
    setIsWeaknessQuiz(false)
    setSelectedGrammarType("")
    setSelectedDifficulty("")
    setSelectedQuestionCount("")
    setSelectedScoringMode("end")
    setAvailableQuestionCount(0)
    // Refresh stats after quiz completion
    fetchStats()
  }

  const handleStartWeaknessQuiz = (grammarType: string) => {
    console.log('🎯 Starting weakness quiz for:', grammarType)
    
    setSelectedGrammarType(grammarType)
    setSelectedDifficulty("") // 난이도는 혼합
    setSelectedQuestionCount("10") // 기본 10문제
    setSelectedScoringMode("immediate") // 즉시 채점으로 설정
    setIsWeaknessQuiz(true)
    setIsQuizActive(true)
    setShowPerformance(false)
  }

  if (showPerformance) {
    return <PerformanceDashboard 
      onBack={() => setShowPerformance(false)} 
      onStartWeaknessQuiz={handleStartWeaknessQuiz}
      onRefresh={() => setPerformanceRefreshTrigger(prev => prev + 1)}
      key={performanceRefreshTrigger}
    />
  }

  if (isQuizActive) {
    return (
      <QuizInterface
        grammarType={selectedGrammarType}
        difficulty={selectedDifficulty}
        questionCount={parseInt(selectedQuestionCount)}
        scoringMode={selectedScoringMode as "end" | "immediate"}
        onComplete={handleQuizComplete}
        user={user}
        isWeaknessQuiz={isWeaknessQuiz}
      />
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">문법 마스터</h1>
                <p className="text-sm text-gray-600">AI 영어 문법 연습</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4" />
                {user.email}
              </div>
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">문법 마스터에 오신 것을 환영합니다!</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              AI가 생성한 영어 문법 문제로 실력을 키워보세요. 원하는 문법유형과 난이도를 선택해 시작하세요.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
                    <p className="text-sm text-gray-600">완료한 퀴즈</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
                    <p className="text-sm text-gray-600">평균 점수</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
                    <p className="text-sm text-gray-600">풀이한 문제 수</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Analytics Button */}
          {stats.totalQuizzes > 0 && (
            <Card className="border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">성취도 분석</h3>
                      <p className="text-sm text-gray-600">상세한 학습 현황과 취약 유형을 확인하세요</p>
                    </div>
                  </div>
                  <Button onClick={() => setShowPerformance(true)} className="bg-purple-600 hover:bg-purple-700">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    분석 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quiz Setup */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                새 퀴즈 시작
              </CardTitle>
              <CardDescription>문법유형, 난이도, 문제 수, 채점 방식을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">문법유형</label>
                  <Select value={selectedGrammarType} onValueChange={setSelectedGrammarType}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="문법유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {grammarTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">난이도</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGenerateModal(true)}
                      disabled={!selectedGrammarType || !selectedDifficulty}
                      className="h-8 px-3 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      추가생성
                    </Button>
                  </div>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="난이도 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            초급
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="intermediate">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            중급
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="advanced">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            고급
                          </Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    문제 수 
                    {availableQuestionCount > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        (최대 {availableQuestionCount}개 가능)
                      </span>
                    )}
                  </label>
                  <Select 
                    value={selectedQuestionCount} 
                    onValueChange={setSelectedQuestionCount}
                    disabled={!selectedGrammarType || !selectedDifficulty}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="문제 수 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuestionCount > 0 && (
                        <>
                          {[5, 10, 15, 20].filter(count => count <= availableQuestionCount).map((count) => (
                            <SelectItem key={count} value={count.toString()}>
                              {count}문제
                            </SelectItem>
                          ))}
                          {availableQuestionCount > 20 && (
                            <SelectItem value={availableQuestionCount.toString()}>
                              {availableQuestionCount}문제 (전체)
                            </SelectItem>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">채점 방식</label>
                  <Select value={selectedScoringMode} onValueChange={setSelectedScoringMode}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="채점 방식 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end">
                        <div className="space-y-1">
                          <div className="font-medium">완료 후 채점</div>
                          <div className="text-xs text-gray-500">모든 문제를 푼 후 결과 확인</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="immediate">
                        <div className="space-y-1">
                          <div className="font-medium">즉시 채점</div>
                          <div className="text-xs text-gray-500">문제마다 바로 정답 확인</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleStartQuiz}
                disabled={!selectedGrammarType || !selectedDifficulty || !selectedQuestionCount}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium"
              >
                <Play className="h-5 w-5 mr-2" />
                퀴즈 시작
                {selectedQuestionCount && ` (${selectedQuestionCount}문제)`}
              </Button>
              <Button
                onClick={handleStartGameQuiz}
                disabled={!selectedGrammarType || !selectedDifficulty || !selectedQuestionCount}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-lg font-medium mt-2"
              >
                <Play className="h-5 w-5 mr-2" />
                게임모드로 시작
                {selectedQuestionCount && ` (${selectedQuestionCount}문제)`}
              </Button>
            </CardContent>
          </Card>

          {/* 문제 생성 모달 */}
          {showGenerateModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
                <Card className="border-2 border-purple-200 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        문제 추가 생성
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowGenerateModal(false)}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription className="bg-gray-50 px-3 py-2 rounded-lg border">
                      <span className="font-medium text-gray-700">{selectedGrammarType}</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="font-medium text-gray-700">
                        {REVERSE_DIFFICULTY_MAPPING[selectedDifficulty] || selectedDifficulty}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">생성할 문제 수</label>
                      <Select value={generateCount} onValueChange={setGenerateCount}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="문제 수 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {[3, 5, 10, 15, 20].map((count) => (
                            <SelectItem key={count} value={count.toString()}>
                              {count}문제
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">AI 엔진</label>
                      <Select value={generateEngine} onValueChange={setGenerateEngine}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="AI 엔진 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span>Gemini</span>
                              <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800 text-xs">
                                추천
                              </Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="lmstudio">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span>LM Studio</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setShowGenerateModal(false)}
                        disabled={isGenerating}
                        className="flex-1 h-11"
                      >
                        취소
                      </Button>
                      <Button
                        onClick={handleGenerateQuestions}
                        disabled={isGenerating || !generateCount || !generateEngine}
                        className="flex-1 h-11 bg-purple-600 hover:bg-purple-700"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            생성중...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            생성하기
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

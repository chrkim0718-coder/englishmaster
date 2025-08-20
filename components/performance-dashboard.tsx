"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { TrendingUp, Target, AlertTriangle, BarChart3, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PerformanceStats {
  totalQuizzes: number
  totalQuestions: number
  averageScore: number
  grammarTypeStats: Array<{
    grammar_type: string
    total_quizzes: number
    total_questions: number
    correct_answers: number
    average_score: number
  }>
  difficultyStats: Array<{
    difficulty_level: string
    total_quizzes: number
    total_questions: number
    correct_answers: number
    average_score: number
  }>
  weakAreas: Array<{
    grammar_type: string
    average_score: number
    total_questions: number
  }>
  recentProgress: Array<{
    date: string
    score: number
    grammar_type: string
    difficulty: string
  }>
}

interface PerformanceDashboardProps {
  onBack: () => void
}

export default function PerformanceDashboard({ onBack }: PerformanceDashboardProps) {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPerformanceData()
  }, [])

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch("/api/performance")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch performance data")
      }

      setStats(data.stats)
    } catch (error) {
      console.error("Error fetching performance:", error)
      toast({
        title: "오류",
        description: "성취도 데이터를 불러오지 못했습니다. 다시 시도해 주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 한글 문법유형 매핑 함수 추가
  const grammarTypeKo = (type: string) => {
    const map: Record<string, string> = {
      "Present Simple": "현재시제",
      "Present Perfect": "현재완료",
      "Past Simple": "과거시제",
      "Past Perfect": "과거완료",
      "Future Tense": "미래시제",
      "Conditionals": "가정법",
      "Passive Voice": "수동태",
      "Modal Verbs": "조동사",
      "Gerunds and Infinitives": "동명사/부정사",
      "Articles": "관사",
      "Prepositions": "전치사",
      "Relative Clauses": "관계사",
    }
    return map[type] || type
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">성취도 데이터를 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto" />
              <p className="text-gray-600">아직 성취도 데이터가 없습니다.</p>
              <Button onClick={onBack}>대시보드로 돌아가기</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">성취도 분석</h1>
                <p className="text-sm text-gray-600">나의 문법 학습 현황을 확인하세요</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-600" />
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
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
                    <p className="text-sm text-gray-600">풀이한 문제 수</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
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
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.weakAreas.length}</p>
                    <p className="text-sm text-gray-600">취약 유형</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Grammar Type */}
          <Card>
            <CardHeader>
              <CardTitle>문법유형별 성취도</CardTitle>
              <CardDescription>문법유형별 정답률</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.grammarTypeStats.map((stat) => (
                  <div key={stat.grammar_type} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{stat.grammar_type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {stat.correct_answers}/{stat.total_questions}
                        </span>
                        <Badge
                          variant="secondary"
                          className={
                            stat.average_score >= 80
                              ? "bg-green-100 text-green-800"
                              : stat.average_score >= 60
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {stat.average_score}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={stat.average_score} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weak Areas */}
          {stats.weakAreas.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  취약 유형
                </CardTitle>
                <CardDescription>이 문법유형을 집중 학습하면 전체 점수를 올릴 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.weakAreas.map((area) => (
                    <Card key={area.grammar_type} className="border-orange-200">
                      <CardContent className="pt-4">
                        <div className="text-center space-y-2">
                          <h4 className="font-medium">{grammarTypeKo(area.grammar_type)}</h4>
                          <div className="text-2xl font-bold text-orange-600">{area.average_score}%</div>
                          <p className="text-sm text-gray-600">{area.total_questions}문제 시도</p>
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            추가 학습 필요
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance by Difficulty */}
          <Card>
            <CardHeader>
              <CardTitle>난이도별 성취도</CardTitle>
              <CardDescription>난이도별 정답률</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.difficultyStats.map((stat) => (
                  <Card key={stat.difficulty_level} className="text-center">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <Badge
                          variant="secondary"
                          className={`capitalize ${
                            stat.difficulty_level === "beginner"
                              ? "bg-green-100 text-green-800"
                              : stat.difficulty_level === "intermediate"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {stat.difficulty_level === "beginner" ? "초급" : stat.difficulty_level === "intermediate" ? "중급" : "고급"}
                        </Badge>
                        <div className="text-3xl font-bold text-gray-900">{stat.average_score}%</div>
                        <div className="text-sm text-gray-600">
                          {stat.correct_answers}/{stat.total_questions} 정답
                        </div>
                        <Progress value={stat.average_score} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Progress */}
          {stats.recentProgress.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>최근 퀴즈 결과</CardTitle>
                <CardDescription>최근 10회 퀴즈 성적</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentProgress.map((progress, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            progress.score >= 80
                              ? "bg-green-500"
                              : progress.score >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                        />
                        <div>
                          <p className="font-medium">{grammarTypeKo(progress.grammar_type)}</p>
                          <p className="text-sm text-gray-600 capitalize">{progress.difficulty === "beginner" ? "초급" : progress.difficulty === "intermediate" ? "중급" : "고급"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            progress.score >= 80
                              ? "bg-green-100 text-green-800"
                              : progress.score >= 60
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {progress.score}%
                        </Badge>
                        <span className="text-sm text-gray-500">{new Date(progress.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

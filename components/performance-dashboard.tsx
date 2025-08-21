"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { TrendingUp, Target, AlertTriangle, BarChart3, ArrowLeft, X, Calendar } from "lucide-react"
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

interface ChartData {
  date: string
  totalQuestions: number
  correctAnswers: number
  totalSessions: number
  accuracyRate: number
  averageScore: number
}

interface ChartStats {
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  averageAccuracy: number
  recentSessions: number
  recentAccuracy: number
}

interface PerformanceDashboardProps {
  onBack: () => void
  onStartWeaknessQuiz: (grammarType: string) => void
  onRefresh?: () => void
}

export default function PerformanceDashboard({ onBack, onStartWeaknessQuiz, onRefresh }: PerformanceDashboardProps) {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showChart, setShowChart] = useState(false)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [chartStats, setChartStats] = useState<ChartStats | null>(null)
  const [selectedGrammarType, setSelectedGrammarType] = useState<string>("")
  const [isLoadingChart, setIsLoadingChart] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchPerformanceData()
  }, [])

  // onRefresh prop이 변경될 때도 데이터 새로고침
  useEffect(() => {
    if (onRefresh) {
      fetchPerformanceData()
    }
  }, [onRefresh])

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

  const fetchChartData = async (grammarType: string) => {
    setIsLoadingChart(true)
    try {
      const response = await fetch(`/api/performance/chart?grammarType=${encodeURIComponent(grammarType)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch chart data")
      }

      setChartData(data.chartData)
      setChartStats(data.overallStats)
      setSelectedGrammarType(grammarType)
      setShowChart(true)
    } catch (error) {
      console.error("Error fetching chart data:", error)
      toast({
        title: "오류",
        description: "차트 데이터를 불러오지 못했습니다. 다시 시도해 주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingChart(false)
    }
  }

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch("/api/performance/debug")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch debug data")
      }

      setDebugInfo(data.debug)
      setShowDebug(true)
      console.log("🔍 Debug info:", data.debug)
    } catch (error) {
      console.error("Error fetching debug info:", error)
      toast({
        title: "디버그 오류",
        description: "디버그 정보를 불러오지 못했습니다.",
        variant: "destructive",
      })
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
      "Gerunds": "동명사",
      "Infinitives": "부정사",
      "Participles": "분사",
      "Articles": "관사",
      "Prepositions": "전치사",
      "Relative Clauses": "관계사",
      "Conjunctions": "접속사",
      "Tenses": "시제",
    }
    return map[type] || type
  }

  // Simple Chart Component
  const SimpleChart = ({ data }: { data: ChartData[] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          데이터가 없습니다
        </div>
      )
    }

    const maxAccuracy = Math.max(...data.map(d => d.accuracyRate))
    const minAccuracy = Math.min(...data.map(d => d.accuracyRate))
    const range = maxAccuracy - minAccuracy || 100

    // SVG 크기와 여백
    const chartWidth = 600
    const chartHeight = 200
    const leftMargin = 50
    const rightMargin = 20
    const topMargin = 20
    const bottomMargin = 40
    const plotWidth = chartWidth - leftMargin - rightMargin
    const plotHeight = chartHeight - topMargin - bottomMargin

    // 포인트 계산
    const points = data.map((item, index) => {
      const x = leftMargin + (index / Math.max(data.length - 1, 1)) * plotWidth
      const y = topMargin + (1 - (item.accuracyRate - minAccuracy) / range) * plotHeight
      return { x, y, ...item }
    })

    // 라인 경로 생성
    const linePath = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ')

    return (
      <div className="h-64 bg-gray-50 rounded-lg p-4">
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
          {/* 배경 격자 */}
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.5"/>
            </pattern>
          </defs>
          <rect x={leftMargin} y={topMargin} width={plotWidth} height={plotHeight} fill="url(#grid)" />
          
          {/* Y축 */}
          <line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={topMargin + plotHeight} stroke="#9ca3af" strokeWidth="1" />
          
          {/* X축 */}
          <line x1={leftMargin} y1={topMargin + plotHeight} x2={leftMargin + plotWidth} y2={topMargin + plotHeight} stroke="#9ca3af" strokeWidth="1" />
          
          {/* Y축 라벨 */}
          <text x={leftMargin - 10} y={topMargin + 5} textAnchor="end" className="text-xs fill-gray-500">
            {maxAccuracy}%
          </text>
          <text x={leftMargin - 10} y={topMargin + plotHeight/2 + 3} textAnchor="end" className="text-xs fill-gray-500">
            {Math.round((maxAccuracy + minAccuracy) / 2)}%
          </text>
          <text x={leftMargin - 10} y={topMargin + plotHeight + 3} textAnchor="end" className="text-xs fill-gray-500">
            {minAccuracy}%
          </text>
          
          {/* 막대 그래프 */}
          {points.map((point, index) => {
            const barWidth = Math.min(plotWidth / data.length * 0.6, 30)
            const barHeight = plotHeight - (point.y - topMargin)
            return (
              <g key={`bar-${index}`}>
                <rect
                  x={point.x - barWidth/2}
                  y={point.y}
                  width={barWidth}
                  height={barHeight}
                  fill="#3b82f6"
                  opacity="0.7"
                  className="hover:opacity-1 transition-opacity cursor-pointer"
                >
                  <title>
                    {`${point.date}\n정답률: ${point.accuracyRate}%\n문제: ${point.totalQuestions}개\n세션: ${point.totalSessions}회`}
                  </title>
                </rect>
              </g>
            )
          })}
          
          {/* 추세선 */}
          {data.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          
          {/* 데이터 포인트 */}
          {points.map((point, index) => (
            <g key={`point-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#ef4444"
                stroke="white"
                strokeWidth="2"
                className="hover:r-6 transition-all cursor-pointer"
              >
                <title>
                  {`${point.date}\n정답률: ${point.accuracyRate}%\n문제: ${point.totalQuestions}개\n세션: ${point.totalSessions}회`}
                </title>
              </circle>
            </g>
          ))}
          
          {/* X축 라벨 */}
          {points.map((point, index) => (
            <text
              key={`label-${index}`}
              x={point.x}
              y={topMargin + plotHeight + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
              transform={`rotate(-45, ${point.x}, ${topMargin + plotHeight + 20})`}
            >
              {point.date.split('.').slice(0, 2).join('.')}
            </text>
          ))}
        </svg>
        
        {/* 범례 */}
        <div className="flex justify-center mt-2 space-x-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 opacity-70 mr-1"></div>
            <span className="text-gray-600">정답률 (막대)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-0.5 bg-red-500 mr-1"></div>
            <span className="text-gray-600">추세선</span>
          </div>
        </div>
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
              <p className="text-gray-600">성취도 데이터를 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats || stats.totalQuizzes === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
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
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchDebugInfo}
                  className="text-red-600 hover:text-red-700"
                >
                  🔍 데이터 확인
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/migrate-session-data', { method: 'POST' })
                      const result = await response.json()
                      if (result.success) {
                        alert(`✅ 데이터 마이그레이션 완료!\n${result.totalAnswers}개의 답변이 마이그레이션되었습니다.`)
                        // Refresh the page
                        window.location.reload()
                      } else {
                        alert('❌ 마이그레이션 실패: ' + result.error)
                      }
                    } catch (error) {
                      alert('❌ 마이그레이션 오류: ' + error)
                    }
                  }}
                  className="text-green-600 hover:text-green-700"
                >
                  📦 데이터 복구
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* No Data State */}
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="pt-12 pb-12">
              <div className="space-y-6">
                <div className="text-8xl">📊</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">아직 퀴즈 데이터가 없습니다</h2>
                  <p className="text-gray-600 mb-6">
                    성취도 분석을 보려면 먼저 퀴즈를 풀어보세요!
                  </p>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-lg text-left max-w-md mx-auto">
                  <h3 className="font-semibold text-blue-900 mb-3">🎯 시작하는 방법:</h3>
                  <div className="space-y-2 text-sm text-blue-800">
                    <p>1. 메인 화면으로 돌아가기</p>
                    <p>2. 원하는 문법 유형 선택</p>
                    <p>3. 난이도 선택 후 퀴즈 시작</p>
                    <p>4. 몇 개 퀴즈를 완료하면 분석 데이터가 나타납니다</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700">
                    퀴즈 시작하러 가기
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={fetchDebugInfo}
                    className="text-red-600 hover:text-red-700"
                  >
                    🔍 상세 확인
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/migrate-session-data', { method: 'POST' })
                        const result = await response.json()
                        if (result.success) {
                          alert(`✅ 데이터 마이그레이션 완료!\n${result.totalAnswers}개의 답변이 마이그레이션되었습니다.`)
                          // Refresh the page
                          window.location.reload()
                        } else {
                          alert('❌ 마이그레이션 실패: ' + result.error)
                        }
                      } catch (error) {
                        alert('❌ 마이그레이션 오류: ' + error)
                      }
                    }}
                    className="text-green-600 hover:text-green-700"
                  >
                    📦 데이터 복구
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Debug Modal for No Data State */}
        {showDebug && debugInfo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    🔍 시스템 상태 확인
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebug(false)}
                    className="hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-6">
                  <Card className="shadow-sm">
                    <CardHeader className="bg-blue-50 rounded-t-lg">
                      <CardTitle className="text-blue-900">👤 사용자 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="text-sm space-y-2">
                        <p><strong>사용자 ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{debugInfo.userId}</code></p>
                        <p><strong>이메일:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{debugInfo.userEmail}</code></p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="bg-green-50 rounded-t-lg">
                      <CardTitle className="text-green-900">📊 퀴즈 세션 데이터</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="text-sm space-y-2">
                        <p><strong>세션 개수:</strong> <span className="font-mono bg-blue-100 px-2 py-1 rounded">{debugInfo.sessions.count}</span></p>
                        {debugInfo.sessions.data.length > 0 ? (
                          <div className="mt-4">
                            <p className="font-medium mb-2">샘플 데이터:</p>
                            <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                              <pre className="text-xs">{JSON.stringify(debugInfo.sessions.data, null, 2)}</pre>
                            </div>
                          </div>
                        ) : (
                          <p className="text-orange-600">⚠️ 퀴즈 세션 데이터가 없습니다!</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-blue-800">💡 해결 방법</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-2 text-blue-800">
                        <p>🎯 <strong>퀴즈를 풀어보세요!</strong></p>
                        <p>• 메인 화면에서 문법 유형을 선택하고 퀴즈를 시작하세요</p>
                        <p>• 최소 1-2개 퀴즈를 완료해야 성취도 데이터가 표시됩니다</p>
                        <p>• 다양한 문법 유형을 시도해보면 더 자세한 분석을 받을 수 있습니다</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end pt-4 border-t space-x-2">
                    <Button 
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/migrate-session-data', { method: 'POST' })
                          const result = await response.json()
                          if (result.success) {
                            alert(`✅ 데이터 마이그레이션 완료!\n${result.totalAnswers}개의 답변이 마이그레이션되었습니다.`)
                            // Refresh debug info
                            fetchDebugInfo()
                          } else {
                            alert('❌ 마이그레이션 실패: ' + result.error)
                          }
                        } catch (error) {
                          alert('❌ 마이그레이션 오류: ' + error)
                        }
                      }}
                      variant="outline"
                      className="px-4"
                    >
                      📦 데이터 마이그레이션
                    </Button>
                    <Button 
                      onClick={() => setShowDebug(false)}
                      className="px-6"
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDebugInfo}
              className="text-red-600 hover:text-red-700"
            >
              🔍 데이터 확인
            </Button>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchChartData(stat.grammar_type)}
                          disabled={isLoadingChart}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          {isLoadingChart ? "로딩..." : "그래프"}
                        </Button>
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
          {stats.weakAreas.length > 0 ? (
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
                          <div className="space-y-2">
                            <Badge variant="outline" className="border-orange-300 text-orange-700">
                              추가 학습 필요
                            </Badge>
                            <div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  console.log('🔄 Button clicked for:', area.grammar_type)
                                  const koreanType = grammarTypeKo(area.grammar_type)
                                  console.log('🔄 Korean type:', koreanType)
                                  onStartWeaknessQuiz(koreanType)
                                }}
                              >
                                틀린 문제 풀어보기
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  축하합니다! 🎉
                </CardTitle>
                <CardDescription>현재 틀린 문제가 있는 취약 문법 유형이 없습니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-6xl">🏆</div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-700">완벽한 성취!</h3>
                    <p className="text-gray-600 mt-2">
                      모든 틀린 문제를 마스터하셨습니다!<br />
                      새로운 문법 유형에 도전하거나 더 높은 난이도에 도전해보세요.
                    </p>
                  </div>
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
                {stats.difficultyStats
                  .filter(stat => stat.total_quizzes > 0) // 실제로 푼 난이도만 표시
                  .map((stat) => (
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
                        <div className="text-xs text-gray-500">
                          {stat.total_quizzes}회 퀴즈
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

      {/* Chart Modal */}
      {showChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    {selectedGrammarType} 문제풀이 현황
                  </h2>
                  <p className="text-gray-600 mt-1">날짜별 정답률 변화를 확인하세요</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChart(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Chart Stats Summary */}
              {chartStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{chartStats.totalSessions}</div>
                        <p className="text-sm text-gray-600">총 세션</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{chartStats.totalQuestions}</div>
                        <p className="text-sm text-gray-600">총 문제</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{chartStats.averageAccuracy}%</div>
                        <p className="text-sm text-gray-600">전체 정답률</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{chartStats.recentAccuracy}%</div>
                        <p className="text-sm text-gray-600">최근 30일 정답률</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    날짜별 정답률 추이
                  </CardTitle>
                  <CardDescription>
                    각 막대에 마우스를 올리면 상세 정보를 확인할 수 있습니다
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SimpleChart data={chartData} />
                </CardContent>
              </Card>

              {/* Data Table */}
              {chartData.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>상세 데이터</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">날짜</th>
                            <th className="text-right p-2">세션</th>
                            <th className="text-right p-2">문제수</th>
                            <th className="text-right p-2">정답</th>
                            <th className="text-right p-2">정답률</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.map((item, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-2">{item.date}</td>
                              <td className="text-right p-2">{item.totalSessions}회</td>
                              <td className="text-right p-2">{item.totalQuestions}개</td>
                              <td className="text-right p-2">{item.correctAnswers}개</td>
                              <td className="text-right p-2">
                                <Badge
                                  variant="secondary"
                                  className={
                                    item.accuracyRate >= 80
                                      ? "bg-green-100 text-green-800"
                                      : item.accuracyRate >= 60
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                  }
                                >
                                  {item.accuracyRate}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Debug Modal */}
      {showDebug && debugInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  🔍 시스템 상태 확인
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebug(false)}
                  className="hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* User Info */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-blue-50 rounded-t-lg">
                    <CardTitle className="text-blue-900">👤 사용자 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm space-y-2">
                      <p><strong>사용자 ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{debugInfo.userId}</code></p>
                      <p><strong>이메일:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{debugInfo.userEmail}</code></p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz Sessions */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-green-50 rounded-t-lg">
                    <CardTitle className="text-green-900">📊 퀴즈 세션 데이터</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm space-y-2">
                      <p><strong>세션 개수:</strong> <span className="font-mono bg-blue-100 px-2 py-1 rounded">{debugInfo.sessions.count}</span></p>
                      {debugInfo.sessions.error && (
                        <p className="text-red-600"><strong>오류:</strong> {debugInfo.sessions.error}</p>
                      )}
                      {debugInfo.sessions.data.length > 0 ? (
                        <div className="mt-4">
                          <p className="font-medium mb-2">샘플 데이터:</p>
                          <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                            <pre className="text-xs">{JSON.stringify(debugInfo.sessions.data, null, 2)}</pre>
                          </div>
                        </div>
                      ) : (
                        <p className="text-orange-600">⚠️ 퀴즈 세션 데이터가 없습니다!</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* User Answers */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-purple-50 rounded-t-lg">
                    <CardTitle className="text-purple-900">✍️ 사용자 답변 데이터</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm space-y-2">
                      <p><strong>답변 개수:</strong> <span className="font-mono bg-blue-100 px-2 py-1 rounded">{debugInfo.answers.count}</span></p>
                      {debugInfo.answers.error && (
                        <p className="text-red-600"><strong>오류:</strong> {debugInfo.answers.error}</p>
                      )}
                        {debugInfo.answers.data.length > 0 ? (
                          <div className="mt-4">
                            <p className="font-medium mb-2">샘플 데이터:</p>
                            <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                              <pre className="text-xs">{JSON.stringify(debugInfo.answers.data, null, 2)}</pre>
                            </div>
                          </div>
                        ) : (
                          <p className="text-orange-600">⚠️ 사용자 답변 데이터가 없습니다!</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                {/* All Sessions Sample */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-yellow-50 rounded-t-lg">
                    <CardTitle className="text-yellow-900">🗂️ 전체 데이터베이스 상태</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm space-y-2">
                      {debugInfo.allSessions.data.length > 0 ? (
                        <div>
                          <p className="font-medium mb-2">데이터베이스 샘플:</p>
                          <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                            <pre className="text-xs">{JSON.stringify(debugInfo.allSessions.data, null, 2)}</pre>
                          </div>
                        </div>
                      ) : (
                        <p className="text-red-600">❌ 데이터베이스에 퀴즈 세션이 전혀 없습니다!</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="border-blue-200 bg-blue-50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-blue-800">💡 해결 방법</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2 text-blue-800">
                      {debugInfo.sessions.count === 0 && (
                        <>
                          <p>🎯 <strong>퀴즈를 풀어보세요!</strong></p>
                          <p>• 메인 화면에서 문법 유형을 선택하고 퀴즈를 시작하세요</p>
                          <p>• 최소 1-2개 퀴즈를 완료해야 성취도 데이터가 표시됩니다</p>
                          <p>• 다양한 문법 유형을 시도해보면 더 자세한 분석을 받을 수 있습니다</p>
                        </>
                      )}
                      {debugInfo.allSessions.data.length === 0 && (
                        <>
                          <p>🔧 <strong>시스템 문제일 수 있습니다!</strong></p>
                          <p>• 데이터베이스에 퀴즈 데이터가 전혀 없습니다</p>
                          <p>• 관리자에게 문의하시거나 퀴즈 시스템을 확인해주세요</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end pt-4 border-t space-x-2">
                  <Button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/migrate-session-data', { method: 'POST' })
                        const result = await response.json()
                        if (result.success) {
                          alert(`✅ 데이터 마이그레이션 완료!\n${result.totalAnswers}개의 답변이 마이그레이션되었습니다.`)
                          // Refresh debug info
                          fetchDebugInfo()
                        } else {
                          alert('❌ 마이그레이션 실패: ' + result.error)
                        }
                      } catch (error) {
                        alert('❌ 마이그레이션 오류: ' + error)
                      }
                    }}
                    variant="outline"
                    className="px-4"
                  >
                    📦 데이터 마이그레이션
                  </Button>
                  <Button 
                    onClick={() => setShowDebug(false)}
                    className="px-6"
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, BookOpen, BarChart3, Settings, Trash2, Plus, TrendingUp, Activity, Cpu } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import QuestionGenerator from "@/components/question-generator"
import { LMStudioModelSelector } from "@/components/lmstudio-model-selector"
import { REVERSE_GRAMMAR_TYPE_MAPPING, REVERSE_DIFFICULTY_MAPPING } from "@/lib/ai/types"

interface AdminStats {
  totalUsers: number
  totalQuestions: number
  totalSessions: number
  grammarTypeStats: Record<string, number>
  difficultyStats: Record<string, number>
  recentActivity: Array<{
    id: string
    score_percentage: number
    grammar_type: string
    difficulty_level: string
    completed_at: string
    user_profiles: { email: string }
  }>
}

interface User {
  id: string
  email: string
  full_name: string
  created_at: string
  totalSessions: number
  averageScore: number
  lastActivity: string
}

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  grammar_type: string
  difficulty_level: string
  created_at: string
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsPage, setQuestionsPage] = useState(1)
  const [questionsTotalPages, setQuestionsTotalPages] = useState(1)
  const [questionsFilter, setQuestionsFilter] = useState({
    grammarType: "all",
    difficultyLevel: "all",
    search: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [deletingQuestions, setDeletingQuestions] = useState<Set<string>>(new Set()) // 삭제 중인 문제 ID 추적
  const { toast } = useToast()

  // 영어 문법 유형을 한글로 변환하는 헬퍼 함수
  const getKoreanGrammarType = (englishType: string): string => {
    return REVERSE_GRAMMAR_TYPE_MAPPING[englishType] || englishType
  }

  // 영어 난이도를 한글로 변환하는 헬퍼 함수
  const getKoreanDifficulty = (englishDifficulty: string): string => {
    return REVERSE_DIFFICULTY_MAPPING[englishDifficulty] || englishDifficulty
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers()
    } else if (activeTab === "questions") {
      fetchQuestions()
    }
  }, [activeTab, questionsPage, questionsFilter])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast({
        title: "Error",
        description: "Failed to load admin statistics.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      })
    }
  }

  const fetchQuestions = async () => {
    try {
      const params = new URLSearchParams({
        page: questionsPage.toString(),
        limit: "20",
      })
      if (questionsFilter.grammarType !== "all") params.append("grammarType", questionsFilter.grammarType)
      if (questionsFilter.difficultyLevel !== "all") params.append("difficultyLevel", questionsFilter.difficultyLevel)

      const response = await fetch(`/api/admin/questions?${params}`)
      const data = await response.json()
      if (data.success) {
        setQuestions(data.questions)
        setQuestionsTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
      toast({
        title: "Error",
        description: "Failed to load questions.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    console.log("Attempting to delete question with ID:", questionId)
    
    // 이미 삭제 중인 문제인지 확인
    if (deletingQuestions.has(questionId)) {
      console.log("Question is already being deleted:", questionId)
      return
    }
    
    if (!confirm("정말로 이 문제를 삭제하시겠습니까?")) return

    // 삭제 중 상태로 설정
    setDeletingQuestions(prev => new Set(prev).add(questionId))

    try {
      console.log("Sending DELETE request...")
      const response = await fetch("/api/admin/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      })

      console.log("Response status:", response.status)
      const responseData = await response.json()
      console.log("Response data:", responseData)

      if (response.ok) {
        toast({
          title: "성공",
          description: "문제가 성공적으로 삭제되었습니다.",
        })
        
        // 즉시 UI에서 해당 문제 제거
        setQuestions(prevQuestions => {
          const updatedQuestions = prevQuestions.filter(q => q.id !== questionId)
          console.log("Updated questions count:", updatedQuestions.length)
          return updatedQuestions
        })
        
        // 페이지가 비어있다면 이전 페이지로 이동
        const remainingQuestions = questions.filter(q => q.id !== questionId).length
        if (remainingQuestions === 0 && questionsPage > 1) {
          setQuestionsPage(prev => prev - 1)
        }
        
        // 통계 새로고침 (문제 목록은 이미 업데이트됨)
        fetchStats()
        
      } else {
        throw new Error(responseData.error || "Failed to delete question")
      }
    } catch (error) {
      console.error("Error deleting question:", error)
      toast({
        title: "오류",
        description: `문제 삭제에 실패했습니다: ${error}`,
        variant: "destructive",
      })
      
      // 실패시 삭제 중 상태 해제
      setDeletingQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    } finally {
      // 성공시 삭제 중 상태 해제
      setDeletingQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">관리자 대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          관리자 대시보드
        </h1>
        <p className="text-muted-foreground mt-2">사용자, 문제 관리 및 시스템 현황을 모니터링하세요</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            전체 현황
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            사용자 관리
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            문제 관리
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            문제 일괄 생성
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            AI 모델 설정
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                    <p className="text-sm text-gray-600">전체 사용자</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalQuestions || 0}</p>
                    <p className="text-sm text-gray-600">전체 문제</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalSessions || 0}</p>
                    <p className="text-sm text-gray-600">퀴즈 세션</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Activity className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.recentActivity?.length || 0}</p>
                    <p className="text-sm text-gray-600">최근 활동</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Questions by Grammar Type */}
          <Card>
            <CardHeader>
              <CardTitle>문법유형별 문제 수</CardTitle>
              <CardDescription>문법유형별 문제 분포</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats?.grammarTypeStats || {}).map(([type, count]) => (
                  <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{count}</p>
                    <p className="text-sm text-gray-600">{getKoreanGrammarType(type)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>최근 퀴즈 활동</CardTitle>
              <CardDescription>사용자별 최근 퀴즈 세션</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentActivity?.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          activity.score_percentage >= 80
                            ? "bg-green-500"
                            : activity.score_percentage >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium">{activity.user_profiles.email}</p>
                        <p className="text-sm text-gray-600">
                          {getKoreanGrammarType(activity.grammar_type)} • {getKoreanDifficulty(activity.difficulty_level)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          activity.score_percentage >= 80
                            ? "bg-green-100 text-green-800"
                            : activity.score_percentage >= 60
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {activity.score_percentage}%
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(activity.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>사용자 관리</CardTitle>
              <CardDescription>등록된 사용자를 확인하고 관리하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-gray-600">가입일: {new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{user.totalSessions}회 퀴즈</p>
                        <p className="text-sm text-gray-600">평균 점수 {user.averageScore}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">최근 활동</p>
                        <p className="text-sm font-medium">{new Date(user.lastActivity).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>문제 관리</CardTitle>
              <CardDescription>문법 문제를 확인, 필터, 관리하세요</CardDescription>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm("정말 모든 문제를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
                    try {
                      const response = await fetch("/api/admin/questions", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ deleteAll: true }),
                      });
                      if (response.ok) {
                        toast({ title: "성공", description: "모든 문제가 삭제되었습니다." });
                        fetchQuestions();
                        fetchStats();
                      } else {
                        throw new Error("전체 삭제 실패");
                      }
                    } catch (error) {
                      toast({ title: "오류", description: "전체 문제 삭제에 실패했습니다.", variant: "destructive" });
                    }
                  }}
                  className="ml-auto"
                >
                  전체 문제 삭제
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <Select
                  value={questionsFilter.grammarType}
                  onValueChange={(value) => setQuestionsFilter((prev) => ({ ...prev, grammarType: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="문법유형별 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 문법유형</SelectItem>
                    {Object.keys(stats?.grammarTypeStats || {}).map((type) => (
                      <SelectItem key={type} value={type}>
                        {getKoreanGrammarType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={questionsFilter.difficultyLevel}
                  onValueChange={(value) => setQuestionsFilter((prev) => ({ ...prev, difficultyLevel: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="난이도별 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 난이도</SelectItem>
                    <SelectItem value="beginner">초급</SelectItem>
                    <SelectItem value="intermediate">중급</SelectItem>
                    <SelectItem value="advanced">고급</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {questions.map((question) => (
                  <Card key={question.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-lg">{question.question_text}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {getKoreanGrammarType(question.grammar_type)}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`capitalize ${
                                question.difficulty_level === "beginner"
                                  ? "bg-green-100 text-green-800"
                                  : question.difficulty_level === "intermediate"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {getKoreanDifficulty(question.difficulty_level)}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deletingQuestions.has(question.id)}
                              onClick={() => {
                                if (!question.id || typeof question.id !== "string" || question.id.trim() === "") {
                                  toast({ title: "오류", description: "유효하지 않은 문제 ID입니다.", variant: "destructive" });
                                  return;
                                }
                                handleDeleteQuestion(question.id)
                              }}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingQuestions.has(question.id) && (
                                <span className="ml-1 text-xs">삭제중...</span>
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div
                            className={`p-2 rounded ${
                              question.correct_answer === "A" ? "bg-green-100 border border-green-500" : "bg-gray-50"
                            }`}
                          >
                            <span className="font-medium">A)</span> {question.option_a}
                          </div>
                          <div
                            className={`p-2 rounded ${
                              question.correct_answer === "B" ? "bg-green-100 border border-green-500" : "bg-gray-50"
                            }`}
                          >
                            <span className="font-medium">B)</span> {question.option_b}
                          </div>
                          <div
                            className={`p-2 rounded ${
                              question.correct_answer === "C" ? "bg-green-100 border border-green-500" : "bg-gray-50"
                            }`}
                          >
                            <span className="font-medium">C)</span> {question.option_c}
                          </div>
                          <div
                            className={`p-2 rounded ${
                              question.correct_answer === "D" ? "bg-green-100 border border-green-500" : "bg-gray-50"
                            }`}
                          >
                            <span className="font-medium">D)</span> {question.option_d}
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded text-sm">
                          <p>
                            <strong>해설:</strong> {question.explanation}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {questionsTotalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setQuestionsPage((prev) => Math.max(1, prev - 1))}
                    disabled={questionsPage === 1}
                  >
                    이전
                  </Button>
                  <span className="flex items-center px-4">
                    {questionsTotalPages}페이지 중 {questionsPage}페이지
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setQuestionsPage((prev) => Math.min(questionsTotalPages, prev + 1))}
                    disabled={questionsPage === questionsTotalPages}
                  >
                    다음
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <QuestionGenerator />
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  AI 모델 설정
                </CardTitle>
                <CardDescription>
                  문제 생성에 사용할 AI 모델을 설정하고 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">현재 AI Provider</h3>
                      <Badge variant="outline">
                        {process.env.AI_PROVIDER || 'gemini'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <LMStudioModelSelector />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

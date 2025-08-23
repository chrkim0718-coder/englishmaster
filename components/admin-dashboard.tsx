"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Users, BookOpen, BarChart3, Settings, Trash2, Plus, TrendingUp, Activity, Cpu, Database } from "lucide-react"
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
  emailConfirmed: boolean
  emailConfirmedAt: string | null
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

interface ValidationResult {
  category: string
  severity: 'error' | 'warning' | 'info'
  message: string
  data?: any
}

interface ValidationSummary {
  totalQuestions: number
  errors: number
  warnings: number
  infos: number
}

export default function AdminDashboard() {
  // 문제 데이터 이슈별 조치 핸들러들
  async function handleAutoFillQuestion(id: string) {
    // 예시: 모든 빈 옵션을 'N/A'로 채움
    await fetch(`/api/admin/questions/${id}/autofill`, { method: 'POST' });
    toast({ title: '자동채움 완료', description: '누락된 필드가 자동으로 채워졌습니다.' });
    fetchQuestions();
  }

  async function handleFixGrammarType(id: string, grammarType: string) {
    await fetch(`/api/admin/questions/${id}/grammar-type`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grammar_type: grammarType })
    });
    toast({ title: '문법유형 수정 완료' });
    fetchQuestions();
  }

  async function handleFixExplanation(id: string, explanation: string) {
    await fetch(`/api/admin/questions/${id}/explanation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ explanation })
    });
    toast({ title: '설명 수정 완료' });
    fetchQuestions();
  }

  async function handleAutoFillOptions(id: string) {
    await fetch(`/api/admin/questions/${id}/autofill-options`, { method: 'POST' });
    toast({ title: '옵션 자동채움 완료' });
    fetchQuestions();
  }

  // ...기존 코드 삭제 (중복 함수 제거)...
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsPage, setQuestionsPage] = useState(1)
  const [questionsTotalPages, setQuestionsTotalPages] = useState(1)
  const [questionsFilter, setQuestionsFilter] = useState({
    grammarType: "all", // 빈 문자열이 아닌 값으로 초기화
    difficultyLevel: "all", // 빈 문자열이 아닌 값으로 초기화
    search: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [deletingQuestions, setDeletingQuestions] = useState<Set<string>>(new Set()) // 삭제 중인 문제 ID 추적
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Question validation states
  const [validationQuestions, setValidationQuestions] = useState<any[]>([])
  const [validationCurrentPage, setValidationCurrentPage] = useState(1)
  const [validationTotalPages, setValidationTotalPages] = useState(1)
  const [validationTotalCount, setValidationTotalCount] = useState(0)
  const [selectedGrammarType, setSelectedGrammarType] = useState("all")
  const [grammarTypeCounts, setGrammarTypeCounts] = useState<Record<string, number>>({})
  const [grammarTypeDetails, setGrammarTypeDetails] = useState<Record<string, {
    total: number;
    beginner: number;
    intermediate: number;
    advanced: number;
  }>>({});

  // 임시 비밀번호 상태 및 전송 핸들러
  const [tempPassword, setTempPassword] = useState("");
  const [isSendingTempPassword, setIsSendingTempPassword] = useState(false);

  function generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async function handleSendTempPassword(email: string) {
    if (!email) return;
    const randomPassword = generateRandomPassword(8);
    setIsSendingTempPassword(true);
    try {
      const res = await fetch("/api/admin/send-temp-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tempPassword: randomPassword }),
      });
      if (res.ok) {
        toast({ title: "성공", description: `임시 비밀번호 메일이 전송되었습니다. (${randomPassword})` });
      } else {
        toast({ title: "오류", description: "메일 전송에 실패했습니다.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "오류", description: "메일 전송 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsSendingTempPassword(false);
    }
  }

  // User management states
  const [showCreateUserForm, setShowCreateUserForm] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '' })
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState<Set<string>>(new Set())
  const [showPasswordReset, setShowPasswordReset] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isFixingUser, setIsFixingUser] = useState<Set<string>>(new Set())
  const [isFixingAllUsers, setIsFixingAllUsers] = useState(false)
  const [isLoadingValidation, setIsLoadingValidation] = useState(false)
  const [validatingQuestions, setValidatingQuestions] = useState<Set<string>>(new Set())

  // Duplicate management states
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([])
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false)
  
  // Data management states
  const [dataAnalysis, setDataAnalysis] = useState<any>(null)
  const [isCheckingData, setIsCheckingData] = useState(false)
  const [isFixingData, setIsFixingData] = useState(false)
  
  // AI validation states
  const [isAIValidating, setIsAIValidating] = useState(false)
  const [lmstudioUrl, setLmstudioUrl] = useState("http://localhost:1234")
  const [lmstudioSettings, setLmstudioSettings] = useState<any>(null)
  const [aiValidationResults, setAiValidationResults] = useState<any[]>([])
  const [aiValidationProgress, setAiValidationProgress] = useState({
    current: 0,
    total: 0,
    currentQuestion: '',
    status: ''
  })
  
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
    loadLMStudioSettings()
  }, [])

  useEffect(() => {
    if (activeTab === "users" || activeTab === "overview") {
      fetchUsers()
    } else if (activeTab === "questions") {
      fetchQuestions()
    } else if (activeTab === "question-validation") {
      fetchValidationQuestions()
    } else if (activeTab === "duplicates") {
      fetchDuplicateQuestions()
    }
  }, [activeTab, questionsPage, questionsFilter, validationCurrentPage, selectedGrammarType])

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

  // User management functions
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: "오류",
        description: "이메일과 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingUser(true)
    try {
      const response = await fetch("/api/admin/user-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          email: newUser.email,
          password: newUser.password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "성공",
          description: data.message,
        })
        setNewUser({ email: '', password: '' })
        setShowCreateUserForm(false)
        // Refresh all relevant data after user creation
        fetchUsers() // Refresh users list
        fetchStats() // Refresh admin stats
      } else {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast({
        title: "오류",
        description: "사용자 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`정말 사용자 "${email}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    setIsDeletingUser(prev => new Set(prev).add(userId))
    try {
      const response = await fetch("/api/admin/user-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          userId: userId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "성공",
          description: data.message,
        })
        fetchUsers() // Refresh users list
        fetchStats() // Refresh admin statistics
      } else {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "오류",
        description: "사용자 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDeletingUser(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleFixUserLogin = async (userId: string, email: string) => {
    setIsFixingUser(prev => new Set(prev).add(userId))
    try {
      const response = await fetch("/api/admin/fix-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "성공",
          description: `${email}의 로그인 상태가 수정되었습니다.`,
        })
        fetchUsers() // Refresh users list
      } else {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fixing user login:", error)
      toast({
        title: "오류",
        description: "사용자 로그인 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsFixingUser(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleFixAllUsers = async () => {
    if (!confirm("모든 사용자의 로그인 상태를 수정하시겠습니까? 이 작업은 시간이 걸릴 수 있습니다.")) {
      return
    }

    setIsFixingAllUsers(true)
    try {
      const response = await fetch("/api/admin/fix-all-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "성공",
          description: data.message,
        })
        fetchUsers() // Refresh users list
        fetchStats() // Refresh stats
      } else {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fixing all users:", error)
      toast({
        title: "오류",
        description: "사용자 일괄 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsFixingAllUsers(false)
    }
  }

  const handleCheckData = async () => {
    setIsCheckingData(true)
    try {
      const response = await fetch("/api/admin/check-data")
      const data = await response.json()

      if (data.success) {
        setDataAnalysis(data.analysis)
        toast({
          title: "데이터 확인 완료",
          description: "데이터 분석 결과를 확인하세요.",
        })
      } else {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error checking data:", error)
      toast({
        title: "오류",
        description: "데이터 확인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsCheckingData(false)
    }
  }

  const handleFixData = async (action: string) => {
    if (!confirm(`${action === 'fix_difficulty_levels' ? '난이도 데이터를' : '문법 유형 데이터를'} 수정하시겠습니까?`)) {
      return
    }

    setIsFixingData(true)
    try {
      const response = await fetch("/api/admin/fix-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "성공",
          description: data.message + " 잠시 후 분석 결과가 업데이트됩니다.",
        })
        // Refresh data analysis with delay to ensure database update is complete
        setTimeout(() => {
          handleCheckData()
        }, 1500) // 1.5초 후 새로고침으로 데이터 반영 시간 확보
      } else {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fixing data:", error)
      toast({
        title: "오류",
        description: "데이터 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsFixingData(false)
    }
  }

  const handleResetPassword = async (userId: string, email: string) => {
    if (!resetPassword) {
      toast({
        title: "오류",
        description: "새 비밀번호를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (resetPassword.length < 6) {
      toast({
        title: "오류",
        description: "비밀번호는 최소 6자 이상이어야 합니다.",
        variant: "destructive",
      })
      return
    }

    setIsResettingPassword(true)
    try {
      const response = await fetch("/api/admin/user-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reset_password",
          userId: userId,
          password: resetPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "성공",
          description: `${email}의 비밀번호가 재설정되었습니다.`,
        })
        setResetPassword('')
        setShowPasswordReset(null)
      } else {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error resetting password:", error)
      toast({
        title: "오류",
        description: "비밀번호 재설정 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleConfirmUserEmail = async (userId: string, email: string) => {
    try {
      const response = await fetch("/api/admin/user-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "confirm_email",
          userId: userId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "성공",
          description: `${email}의 이메일이 확인되었습니다.`,
        })
        // Refresh users list
        fetchUsers()
      } else {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error confirming email:", error)
      toast({
        title: "오류",
        description: "이메일 확인 중 오류가 발생했습니다.",
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

  const validateDatabase = async () => {
    setIsValidating(true)
    try {
      const response = await fetch("/api/admin/validate")
      const data = await response.json()
      
      if (data.success) {
        setValidationResults(data.results)
        setValidationSummary(data.summary)
        toast({
          title: "검증 완료",
          description: `총 ${data.summary.errors + data.summary.warnings}개의 이슈가 발견되었습니다.`,
        })
      } else {
        throw new Error(data.error || "Validation failed")
      }
    } catch (error) {
      console.error("Error validating database:", error)
      toast({
        title: "오류",
        description: "데이터베이스 검증에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
    }
  }

  const fetchValidationQuestions = async () => {
    setIsLoadingValidation(true)
    try {
      const params = new URLSearchParams({
        page: validationCurrentPage.toString(),
        limit: "10",
        validationStatus: "pending"
      })
      
      if (selectedGrammarType !== "all") {
        params.append("grammarType", selectedGrammarType)
      }

      const response = await fetch(`/api/admin/question-validation?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setValidationQuestions(data.questions)
        setValidationTotalPages(data.totalPages)
        setValidationTotalCount(data.totalCount)
        setGrammarTypeCounts(data.grammarTypeCounts)
        if (data.grammarTypeDetails) {
          setGrammarTypeDetails(data.grammarTypeDetails)
        }
      } else {
        throw new Error(data.error || "Failed to fetch validation questions")
      }
    } catch (error) {
      console.error("Error fetching validation questions:", error)
      toast({
        title: "오류",
        description: "검증할 문제를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingValidation(false)
    }
  }

  const validateQuestion = async (questionId: string, status: string, notes?: string) => {
    setValidatingQuestions(prev => new Set(prev).add(questionId))
    
    try {
      const response = await fetch("/api/admin/question-validation", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          validationStatus: status,
          validationNotes: notes
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "검증 완료",
          description: `문제가 ${status === 'approved' ? '승인' : '거절'}되었습니다.`,
        })
        
        // Remove question from current list
        setValidationQuestions(prev => prev.filter(q => q.id !== questionId))
        setValidationTotalCount(prev => prev - 1)
        
        // Update grammar type counts
        const question = validationQuestions.find(q => q.id === questionId)
        if (question) {
          setGrammarTypeCounts(prev => ({
            ...prev,
            [question.grammar_type]: Math.max(0, (prev[question.grammar_type] || 1) - 1)
          }))
        }
        
      } else {
        throw new Error(data.error || "Failed to validate question")
      }
    } catch (error) {
      console.error("Error validating question:", error)
      toast({
        title: "오류",
        description: "문제 검증에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setValidatingQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    }
  }

  const fetchDuplicateQuestions = async () => {
    setIsLoadingDuplicates(true)
    try {
      const response = await fetch("/api/admin/duplicates")
      const data = await response.json()
      
      if (data.success) {
        setDuplicateGroups(data.duplicateGroups)
        toast({
          title: "중복 검사 완료",
          description: `${data.totalDuplicates}개의 중복 문제가 발견되었습니다.`,
        })
      } else {
        throw new Error(data.error || "Failed to fetch duplicates")
      }
    } catch (error) {
      console.error("Error fetching duplicates:", error)
      toast({
        title: "오류",
        description: "중복 문제를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDuplicates(false)
    }
  }

  const deleteDuplicateQuestions = async (questionIds: string[], keepQuestionId: string) => {
    const questionsToDelete = questionIds.filter(id => id !== keepQuestionId)
    
    questionsToDelete.forEach(id => {
      setDeletingQuestions(prev => new Set(prev).add(id))
    })
    
    try {
      const response = await fetch("/api/admin/duplicates", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionIds: questionsToDelete }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "삭제 완료",
          description: `${data.deletedCount}개의 중복 문제가 삭제되었습니다.`,
        })
        
        // Remove the group from the list
        setDuplicateGroups(prev => 
          prev.filter(group => 
            !group.questions.some((q: any) => questionsToDelete.includes(q.id))
          )
        )
        
      } else {
        throw new Error(data.error || "Failed to delete duplicates")
      }
    } catch (error) {
      console.error("Error deleting duplicates:", error)
      toast({
        title: "오류",
        description: "중복 문제 삭제에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      questionsToDelete.forEach(id => {
        setDeletingQuestions(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      })
    }
  }

  const loadLMStudioSettings = async () => {
    try {
      console.log("Loading LMStudio settings from API...")
      const response = await fetch('/api/lmstudio/model')
      
      if (response.ok) {
        const data = await response.json()
        console.log("LMStudio settings response:", data)
        
        if (data.success) {
          setLmstudioSettings(data)
          
          // Use the localServer URL from API settings
          if (data.localServer) {
            console.log("Setting LMStudio URL from API:", data.localServer)
            setLmstudioUrl(data.localServer)
          }
          
          console.log("LMStudio settings loaded successfully:", {
            localServer: data.localServer,
            currentModel: data.currentModel,
            availableModels: data.availableModels?.length || 0
          })
          
          return true
        }
      } else {
        console.log("LMStudio API response not ok:", response.status)
      }
      return false
    } catch (error) {
      console.log("LMStudio settings not available:", error)
      setLmstudioSettings(null)
      return false
    }
  }

  // Test LMStudio connection function for UI
  const testLMStudioConnection = async (): Promise<{connected: boolean, message: string, details?: string}> => {
    const url = lmstudioSettings?.localServer || lmstudioUrl;
    console.log("Testing LMStudio connection to:", url);
    
    if (!url) {
      console.log("No URL provided for LMStudio connection test");
      return {
        connected: false,
        message: "URL이 설정되지 않았습니다.",
        details: "LMStudio URL을 먼저 입력해주세요."
      };
    }

    try {
      console.log("Sending connection test request to API...");
      
      const response = await fetch('/api/admin/test-lmstudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lmstudioUrl: url }),
      });

      const data = await response.json();
      console.log("Connection test API response:", data);
      
      if (data.success) {
        return {
          connected: data.connected,
          message: data.message,
          details: data.error || data.details
        };
      } else {
        return {
          connected: false,
          message: "API 오류가 발생했습니다.",
          details: data.error || "알 수 없는 오류"
        };
      }
    } catch (error: any) {
      console.error("Connection test API error:", error);
      return {
        connected: false,
        message: "연결 테스트 API 호출 실패",
        details: error.message
      };
    }
  };

  const performAIValidation = async (selectedQuestions?: string[]) => {
    // Get the effective LMStudio URL (prioritize settings over manual input)
    const effectiveUrl = lmstudioSettings?.localServer || lmstudioUrl;
    
    if (!effectiveUrl) {
      toast({
        title: "오류",
        description: "LMStudio URL을 설정해주세요. AI 모델 설정에서 연결을 확인하거나 수동으로 URL을 입력하세요.",
        variant: "destructive",
      })
      return
    }

    // Use selected questions or current page questions
    const questionIds = selectedQuestions || validationQuestions.map(q => q.id)
    
    if (questionIds.length === 0) {
      toast({
        title: "오류",
        description: "검증할 문제가 없습니다.",
        variant: "destructive",
      })
      return
    }

    setIsAIValidating(true)
    setAiValidationResults([]) // Clear previous results
    setAiValidationProgress({
      current: 0,
      total: questionIds.length,
      currentQuestion: '',
      status: '연결 확인 중...'
    })
    
    try {
      // 1. 먼저 LMStudio 연결 테스트
      const connectionTest = await testLMStudioConnection()
      if (!connectionTest.connected) {
        throw new Error(`LMStudio 연결 실패: ${connectionTest.message}`)
      }

      setAiValidationProgress(prev => ({
        ...prev,
        status: 'AI 검증 시작...'
      }))

      const validationResults: any[] = []
      let successCount = 0
      let failCount = 0

      // 2. 각 문제를 순차적으로 검증
      for (let i = 0; i < questionIds.length; i++) {
        const questionId = questionIds[i]
        const question = validationQuestions.find(q => q.id === questionId)
        const questionText = question?.question_text || `문제 ${i + 1}`

        setAiValidationProgress({
          current: i + 1,
          total: questionIds.length,
          currentQuestion: questionText.length > 50 ? questionText.substring(0, 50) + '...' : questionText,
          status: `검증 중... (${i + 1}/${questionIds.length})`
        })

        try {
          // 개별 문제 검증 API 호출
          const response = await fetch("/api/admin/ai-validation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              questionIds: [questionId], // 한 개씩 처리
              lmstudioUrl: effectiveUrl // Use the effective URL
            }),
          })

          const data = await response.json()
          
          if (data.success && data.results && data.results.length > 0) {
            const result = data.results[0]
            validationResults.push(result)
            
            if (result.score >= 70) {
              successCount++
            } else {
              failCount++
            }

            // 실시간으로 결과 업데이트
            setAiValidationResults(prev => [...prev, result])
            
          } else {
            console.error(`Question ${questionId} validation failed:`, data.error)
            failCount++
            
            // 실패한 경우에도 결과에 추가
            validationResults.push({
              questionId,
              score: 0,
              decision: 'needs_review',
              aiNotes: data.error || '검증 실패',
              suggestions: []
            })
          }
        } catch (questionError) {
          console.error(`Error validating question ${questionId}:`, questionError)
          failCount++
          
          validationResults.push({
            questionId,
            score: 0,
            decision: 'needs_review',
            aiNotes: `검증 오류: ${questionError}`,
            suggestions: []
          })
        }

        // 각 문제 처리 후 잠시 대기 (서버 부하 방지)
        if (i < questionIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      setAiValidationProgress({
        current: questionIds.length,
        total: questionIds.length,
        currentQuestion: '',
        status: '검증 완료!'
      })

      // 최종 결과 표시
      const successMessage = `AI 검증 완료: 총 ${questionIds.length}개 문제 처리 (승인: ${successCount}, 검토 필요: ${failCount})`
      
      toast({
        title: "🤖 AI 검증 완료",
        description: successMessage,
        variant: "default"
      })
      
      // 검증 목록 새로고침
      fetchValidationQuestions()
      
    } catch (error: any) {
      console.error("AI validation error:", error)
      
      let errorMessage = "AI 검증 중 오류가 발생했습니다."
      if (error.message?.includes("연결 실패")) {
        errorMessage = error.message
      } else if (error.message?.includes("ECONNREFUSED")) {
        errorMessage = "LMStudio 서버에 연결할 수 없습니다. LMStudio가 실행 중인지 확인해주세요."
      }
      
      toast({
        title: "오류",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsAIValidating(false)
      setAiValidationProgress({
        current: 0,
        total: 0,
        currentQuestion: '',
        status: ''
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
        {(() => {
          const tabList = [
            { value: "overview", label: "전체 현황", icon: <BarChart3 className="h-4 w-4" /> },
            { value: "users", label: "사용자 관리", icon: <Users className="h-4 w-4" /> },
            { value: "questions", label: "문제 관리", icon: <BookOpen className="h-4 w-4" /> },
            { value: "data", label: "데이터 관리", icon: <Database className="h-4 w-4" /> },
            { value: "validate", label: "데이터 검증", icon: <Settings className="h-4 w-4" /> },
            { value: "question-validation", label: "문제별 검증", icon: <BookOpen className="h-4 w-4" /> },
            { value: "duplicates", label: "중복 문제 관리", icon: <Settings className="h-4 w-4" /> },
            { value: "generate", label: "문제 일괄 생성", icon: <Plus className="h-4 w-4" /> },
            { value: "models", label: "AI 모델 설정", icon: <Cpu className="h-4 w-4" /> },
          ];
          return (
            <TabsList
              className="w-full grid grid-cols-3 gap-1 text-xs lg:flex lg:flex-row lg:grid-cols-none"
            >
              {tabList.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center justify-center gap-1 min-w-0 px-1 py-2 truncate"
                >
                  {tab.icon}
                  <span className="truncate">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          );
        })()}

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
                    <p className="text-2xl font-bold text-gray-900">{users.length}</p>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(stats?.grammarTypeStats || {}).map(([type, count]) => {
                  const details = stats?.grammarTypeStats?.[type]
                  return (
                    <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{count}</p>
                      <p className="text-sm font-medium text-gray-800 mb-2">{getKoreanGrammarType(type)}</p>
                      {details && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                            초 {details.beginner}
                          </span>
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                            중 {details.intermediate}
                          </span>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            고 {details.advanced}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
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
              <CardTitle className="flex items-center justify-between">
                사용자 관리
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleFixAllUsers()}
                    disabled={isFixingAllUsers}
                    variant="outline"
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
                  >
                    {isFixingAllUsers ? "수정 중..." : "모든 사용자 로그인 수정"}
                  </Button>
                  <Button 
                    onClick={() => setShowCreateUserForm(!showCreateUserForm)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    사용자 추가
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>등록된 사용자를 확인하고 관리하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create User Form */}
              {showCreateUserForm && (
                <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">새 사용자 추가</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          이메일
                        </label>
                        <Input
                          type="email"
                          placeholder="사용자 이메일"
                          value={newUser.email}
                          onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          비밀번호
                        </label>
                        <Input
                          type="password"
                          placeholder="초기 비밀번호 (최소 6자)"
                          value={newUser.password}
                          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowCreateUserForm(false)
                          setNewUser({ email: '', password: '' })
                        }}
                      >
                        취소
                      </Button>
                      <Button 
                        onClick={handleCreateUser}
                        disabled={isCreatingUser}
                      >
                        {isCreatingUser ? "생성 중..." : "사용자 생성"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Users List */}
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="relative">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.email}</p>
                            {user.emailConfirmed ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                ✅ 확인됨
                              </span>
                            ) : (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                ❌ 미확인
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">가입일: {new Date(user.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}</p>
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
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-4">
                          {!user.emailConfirmed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfirmUserEmail(user.id, user.email)}
                              className="text-green-600 hover:text-green-700"
                            >
                              이메일 확인
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFixUserLogin(user.id, user.email)}
                            disabled={isFixingUser.has(user.id)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            {isFixingUser.has(user.id) ? "수정 중..." : "로그인 수정"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPasswordReset(user.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            비밀번호 재설정
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            disabled={isDeletingUser.has(user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            {isDeletingUser.has(user.id) ? "삭제 중..." : "삭제"}
                          </Button>

                          {/* 임시비밀번호 보내기 버튼 */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowPasswordReset(user.id)}
                          >
                            임시비밀번호 보내기
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Password Reset & Temp Password Form */}
                    {showPasswordReset === user.id && (
                      <div className="mt-4 p-4 bg-gray-50 border rounded-lg space-y-4">
                        <h4 className="font-medium text-gray-800 mb-3">
                          {user.email}의 비밀번호 재설정
                        </h4>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder="새 비밀번호 (최소 6자)"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setShowPasswordReset(null)
                              setResetPassword('')
                              setTempPassword('')
                            }}
                          >
                            취소
                          </Button>
                          <Button 
                            onClick={() => handleResetPassword(user.id, user.email)}
                            disabled={isResettingPassword}
                          >
                            {isResettingPassword ? "재설정 중..." : "재설정"}
                          </Button>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="text"
                            placeholder="임시 비밀번호 입력"
                            value={tempPassword}
                            onChange={(e) => setTempPassword(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={() => handleSendTempPassword(user.email)}
                            disabled={!tempPassword || isSendingTempPassword}
                            variant="secondary"
                          >
                            {isSendingTempPassword ? "전송 중..." : "임시 비밀번호 메일 전송"}
                          </Button>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                데이터 관리
                <Button 
                  onClick={handleCheckData}
                  disabled={isCheckingData}
                  className="flex items-center gap-2"
                >
                  {isCheckingData ? "확인 중..." : "데이터 확인"}
                </Button>
              </CardTitle>
              <CardDescription>기존 퀴즈 세션 데이터를 확인하고 수정하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {dataAnalysis && (
                <div className="space-y-6">
                  {/* Data Analysis Results */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg">데이터 분석 결과</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{dataAnalysis.totalSessions}</div>
                          <div className="text-sm text-gray-600">총 세션</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{dataAnalysis.sessionsWithDifficulty.length}</div>
                          <div className="text-sm text-gray-600">난이도 설정됨</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{dataAnalysis.sessionsWithoutDifficulty.length}</div>
                          <div className="text-sm text-gray-600">난이도 미설정</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{dataAnalysis.grammarTypes.length}</div>
                          <div className="text-sm text-gray-600">문법 유형</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{dataAnalysis.sessionsWithEnglishGrammar?.length || 0}</div>
                          <div className="text-sm text-gray-600">영어 문법</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{dataAnalysis.sessionsWithKoreanGrammar?.length || 0}</div>
                          <div className="text-sm text-gray-600">한글 문법</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">문법 유형 목록</h4>
                          <div className="bg-white p-3 rounded-lg max-h-32 overflow-y-auto">
                            {dataAnalysis.grammarTypes.map((type: string, index: number) => (
                              <Badge key={index} variant="outline" className="mr-1 mb-1">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">난이도 목록</h4>
                          <div className="bg-white p-3 rounded-lg">
                            {dataAnalysis.difficultyLevels.map((level: string, index: number) => (
                              <Badge key={index} variant="outline" className="mr-1 mb-1">
                                {level || '미설정'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 문제 검증 결과 이슈별 조치 UI */}
                  {validationResults && validationResults.length > 0 && (
                    <Card className="bg-red-50 border-red-200">
                      <CardHeader>
                        <CardTitle className="text-lg">문제 데이터 이슈별 조치</CardTitle>
                        <CardDescription>아래 이슈별로 직접 수정/삭제/자동채움이 가능합니다.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {validationResults.map((issue, idx) => (
                          <div key={issue.id || idx} className="p-3 bg-white rounded-lg border mb-2">
                            <div className="mb-1 text-sm text-gray-700">
                              <b>문제:</b> {issue.question_text || issue.message}
                            </div>
                            <div className="mb-2 text-xs text-gray-500">{issue.category} / {issue.severity}</div>
                            {/* 누락 필드 자동채움 */}
                            {issue.category === 'Data Integrity' && (
                              <Button size="sm" variant="outline" onClick={() => handleAutoFillQuestion(issue.id)}>
                                자동채움
                              </Button>
                            )}
                            {/* 문법유형 오류/미지정 */}
                            {issue.category === 'Grammar Type Validation' && (
                              <div className="flex gap-2 items-center">
                                <select value={issue.grammar_type || ''} onChange={e => handleFixGrammarType(issue.id, e.target.value)} className="border rounded px-2 py-1">
                                  <option value="">문법유형 선택</option>
                                  {Object.keys(REVERSE_GRAMMAR_TYPE_MAPPING).map(type => (
                                    <option key={type} value={type}>{getKoreanGrammarType(type)}</option>
                                  ))}
                                </select>
                                <Button size="sm" onClick={() => handleFixGrammarType(issue.id, issue.grammar_type)}>
                                  수정
                                </Button>
                              </div>
                            )}
                            {/* 설명 너무 짧음 */}
                            {issue.category === 'Explanation Quality' && (
                              <div className="flex gap-2 items-center">
                                <input type="text" className="border rounded px-2 py-1 flex-1" value={issue.explanation || ''} onChange={e => handleFixExplanation(issue.id, e.target.value)} />
                                <Button size="sm" onClick={() => handleFixExplanation(issue.id, issue.explanation)}>
                                  설명 수정
                                </Button>
                              </div>
                            )}
                            {/* 옵션 중복/누락 자동채움 */}
                            {issue.category === 'Option Validation' && (
                              <Button size="sm" variant="outline" onClick={() => handleAutoFillOptions(issue.id)}>
                                옵션 자동채움
                              </Button>
                            )}
                            {/* 즉시 삭제 */}
                            <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleDeleteQuestion(issue.id)}>
                              삭제
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Data Fix Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">난이도 데이터 수정</CardTitle>
                        <CardDescription>
                          난이도가 설정되지 않은 {dataAnalysis.sessionsWithoutDifficulty.length}개 세션을 초급으로 설정
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button 
                          onClick={() => handleFixData('fix_difficulty_levels')}
                          disabled={isFixingData || dataAnalysis.sessionsWithoutDifficulty.length === 0}
                          className="w-full"
                          variant={dataAnalysis.sessionsWithoutDifficulty.length > 0 ? "default" : "secondary"}
                        >
                          {isFixingData ? "수정 중..." : dataAnalysis.sessionsWithoutDifficulty.length > 0 ? "모든 사용자 난이도 수정" : "수정할 데이터 없음"}
                        </Button>
                        <Button 
                          onClick={() => handleFixData('fix_current_user_difficulty')}
                          disabled={isFixingData}
                          className="w-full"
                          variant="outline"
                        >
                          {isFixingData ? "수정 중..." : "현재 사용자만 수정"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">문법 유형 데이터 수정</CardTitle>
                        <CardDescription>
                          영어 문법 유형 {dataAnalysis.sessionsWithEnglishGrammar?.length || 0}개를 한글로 변경
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={() => handleFixData('fix_grammar_types')}
                          disabled={isFixingData || (!dataAnalysis.sessionsWithEnglishGrammar?.length)}
                          className="w-full"
                          variant={dataAnalysis.sessionsWithEnglishGrammar?.length ? "default" : "secondary"}
                        >
                          {isFixingData ? "수정 중..." : dataAnalysis.sessionsWithEnglishGrammar?.length ? "문법 유형 수정" : "수정할 데이터 없음"}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {!dataAnalysis && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">데이터 확인 버튼을 클릭하여 현재 데이터 상태를 분석하세요.</p>
                  <Button onClick={handleCheckData} disabled={isCheckingData}>
                    {isCheckingData ? "확인 중..." : "데이터 확인 시작"}
                  </Button>
                </div>
              )}
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
                  value={questionsFilter.grammarType || "all"}
                  onValueChange={(value) => setQuestionsFilter((prev) => ({ ...prev, grammarType: value || "all" }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="문법유형별 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 문법유형</SelectItem>
                    {Object.keys(stats?.grammarTypeStats || {})
                      .filter((type) => typeof type === "string" && type.trim() !== "")
                      .map((type) => (
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

        <TabsContent value="validate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">데이터베이스 검증</CardTitle>
              <p className="text-gray-600">
                문제 데이터의 무결성을 검사하고 오류를 찾아냅니다.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">검증 실행</h3>
                  <p className="text-sm text-gray-600">
                    데이터베이스의 모든 문제를 검사하여 중복, 오류, 누락된 정보를 찾습니다.
                  </p>
                </div>
                <Button 
                  onClick={validateDatabase}
                  disabled={isValidating}
                  className="min-w-[120px]"
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      검증 중...
                    </>
                  ) : (
                    "검증 시작"
                  )}
                </Button>
              </div>

              {validationSummary && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-lg">검증 결과 요약</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">총 문제 수</p>
                      <p className="text-2xl font-bold text-blue-800">{validationSummary.totalQuestions}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${validationSummary.errors > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                      <p className={`text-sm font-medium ${validationSummary.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        발견된 이슈
                      </p>
                      <p className={`text-2xl font-bold ${validationSummary.errors > 0 ? 'text-red-800' : 'text-green-800'}`}>
                        {validationSummary.errors + validationSummary.warnings}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${validationSummary.errors > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                      <p className={`text-sm font-medium ${validationSummary.errors > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        건강도 점수
                      </p>
                      <p className={`text-2xl font-bold ${validationSummary.errors > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                        {Math.round(((validationSummary.totalQuestions - validationSummary.errors) / validationSummary.totalQuestions) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {validationResults && validationResults.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">상세 검증 결과</h4>
                  {validationResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{result.category}</h5>
                        <span className={`px-2 py-1 rounded text-sm ${
                          result.severity === 'error' ? 'bg-red-100 text-red-800' : 
                          result.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {result.severity === 'error' ? '오류' : 
                           result.severity === 'warning' ? '경고' : '정보'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{result.message}</p>
                      
                      {result.data && Array.isArray(result.data) && result.data.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium text-sm mb-2">상세 정보:</p>
                          <ul className="space-y-1 text-sm">
                            {result.data.slice(0, 5).map((item: any, itemIndex: number) => (
                              <li key={itemIndex} className="text-gray-700">
                                • {typeof item === 'string' ? item : JSON.stringify(item)}
                              </li>
                            ))}
                            {result.data.length > 5 && (
                              <li className="text-gray-500 italic">
                                ... 그리고 {result.data.length - 5}개 더
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {validationResults && validationResults.length === 0 && validationSummary && (
                <div className="text-center py-8">
                  <div className="text-green-600 text-6xl mb-4">✓</div>
                  <h3 className="text-xl font-semibold text-green-800 mb-2">모든 검증을 통과했습니다!</h3>
                  <p className="text-gray-600">데이터베이스에 문제가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="question-validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">문제별 검증</CardTitle>
              <p className="text-gray-600">
                생성된 문제들을 개별적으로 검토하고 승인/거절할 수 있습니다.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Grammar Type Filter */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    문법 유형 필터
                  </label>
                  <Select value={selectedGrammarType} onValueChange={setSelectedGrammarType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 유형</SelectItem>
                      {Object.entries(grammarTypeCounts)
                        .filter(([type]) => typeof type === "string" && type.trim() !== "")
                        .map(([type, count]) => {
                          const details = grammarTypeDetails[type]
                          return (
                            <SelectItem key={type} value={type}>
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {getKoreanGrammarType(type)} ({count}개)
                                </div>
                                {details && (
                                  <div className="text-xs text-gray-500 flex gap-2">
                                    <span className="bg-green-100 text-green-800 px-1 rounded">
                                      초급 {details.beginner}
                                    </span>
                                    <span className="bg-yellow-100 text-yellow-800 px-1 rounded">
                                      중급 {details.intermediate}
                                    </span>
                                    <span className="bg-red-100 text-red-800 px-1 rounded">
                                      고급 {details.advanced}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          )
                        })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <span className="text-sm text-gray-600">
                    검증 대기 중인 문제: {validationTotalCount}개
                  </span>
                </div>
              </div>

              {/* AI Validation Controls */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-800 mb-3">🤖 AI 1차 검증</h4>
                
                {/* LMStudio Status */}
                <div className="mb-4 p-3 bg-white rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">LMStudio 상태</span>
                    <div className="flex items-center gap-2">
                      {lmstudioSettings ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">설정 연결됨</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">설정 없음</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const currentUrl = lmstudioSettings?.localServer || lmstudioUrl;
                          
                          if (!currentUrl) {
                            toast({
                              title: "URL 없음",
                              description: "LMStudio URL을 먼저 설정해주세요.",
                              variant: "destructive"
                            });
                            return;
                          }

                          // 로딩 토스트 표시
                          toast({
                            title: "🔍 연결 확인 중...",
                            description: `${currentUrl}에 연결을 시도하고 있습니다.`,
                          });
                          
                          try {
                            const result = await testLMStudioConnection();
                            
                            if (result.connected) {
                              toast({
                                title: "✅ 연결 성공",
                                description: `${result.message}\n\nURL: ${currentUrl}`,
                                variant: "default"
                              });
                            } else {
                              toast({
                                title: "❌ 연결 실패",
                                description: `${result.message}\n\n${result.details || ''}\n\nURL: ${currentUrl}\n\n🔧 해결 방법:\n1. LMStudio를 실행해주세요\n2. Developer → Local Server로 이동\n3. "Start Server" 버튼을 클릭\n4. 표시된 URL을 사용해주세요`,
                                variant: "destructive"
                              });
                            }
                          } catch (error: any) {
                            toast({
                              title: "🚨 예상치 못한 오류",
                              description: `연결 테스트 중 예상치 못한 오류가 발생했습니다.\n\n오류: ${error.message}\nURL: ${currentUrl}`,
                              variant: "destructive"
                            });
                          }
                        }}
                        className="text-xs"
                      >
                        연결 테스트
                      </Button>
                    </div>
                  </div>
                  
                  {/* 현재 사용 중인 URL 표시 */}
                  <div className="mb-2 p-2 bg-gray-50 rounded text-xs">
                    <span className="text-gray-600">현재 사용 URL:</span>
                    <span className="ml-2 font-mono text-blue-600">
                      {lmstudioSettings?.localServer || lmstudioUrl || '설정되지 않음'}
                    </span>
                    {lmstudioSettings?.localServer && (
                      <Badge variant="outline" className="ml-2 text-xs bg-green-100 text-green-800">
                        환경설정에서 자동 설정됨
                      </Badge>
                    )}
                    {!lmstudioSettings?.localServer && lmstudioUrl && (
                      <Badge variant="outline" className="ml-2 text-xs bg-yellow-100 text-yellow-800">
                        수동 입력
                      </Badge>
                    )}
                  </div>
                  
                  {lmstudioSettings && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">활성 모델:</span>
                        <span className="ml-2 font-medium">{lmstudioSettings.currentModel}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">사용 가능한 모델:</span>
                        <span className="ml-2 font-medium">{lmstudioSettings.availableModels?.length || 0}개</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-blue-700 mb-2 block">
                      LMStudio URL
                    </label>
                    <Input
                      value={lmstudioUrl}
                      onChange={(e) => setLmstudioUrl(e.target.value)}
                      placeholder="예: http://localhost:1234 또는 http://127.0.0.1:1234"
                      className="max-w-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {lmstudioSettings?.localServer ? 
                        "환경설정에서 자동으로 설정됨 (수동 입력시 이 값이 우선 적용됨)" : 
                        "LMStudio 서버 URL을 입력하세요"}
                    </p>
                    <div className="text-xs text-gray-400 mt-1 space-y-1">
                      <div>💡 <strong>우선순위:</strong> 환경설정 URL &gt; 수동 입력 URL</div>
                      <div>🔧 <strong>LMStudio 설정:</strong> LMStudio → Developer → Local Server → Start Server</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => performAIValidation()}
                    disabled={isAIValidating || validationQuestions.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isAIValidating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {aiValidationProgress.status}
                      </>
                    ) : (
                      `현재 페이지 AI 검증 (${validationQuestions.length}개)`
                    )}
                  </Button>
                </div>
                
                {/* AI 검증 진행 상황 표시 */}
                {isAIValidating && aiValidationProgress.total > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">
                        🤖 AI 검증 진행 상황
                      </span>
                      <span className="text-sm text-blue-600">
                        {aiValidationProgress.current}/{aiValidationProgress.total}
                      </span>
                    </div>
                    
                    {/* 진행률 바 */}
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${(aiValidationProgress.current / aiValidationProgress.total) * 100}%` 
                        }}
                      ></div>
                    </div>
                    
                    {/* 현재 처리 중인 문제 */}
                    {aiValidationProgress.currentQuestion && (
                      <div className="text-sm text-blue-700">
                        <span className="font-medium">현재 검증 중:</span>
                        <div className="mt-1 text-blue-600 bg-white p-2 rounded border">
                          {aiValidationProgress.currentQuestion}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-blue-600">
                    AI가 문제의 품질을 자동으로 평가하고 점수가 70점 이상인 문제는 자동 승인됩니다.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadLMStudioSettings}
                    className="text-blue-600"
                  >
                    설정 새로고침
                  </Button>
                </div>
              </div>

              {/* AI Validation Results */}
              {aiValidationResults.length > 0 && (
                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-800 mb-3">🎯 최근 AI 검증 결과</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {aiValidationResults.map((result, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">문제 ID: {result.questionId}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              result.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {result.isValid ? '유효' : '문제 있음'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              result.score >= 70 ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {result.score}점
                            </span>
                          </div>
                        </div>
                        {result.issues.length > 0 && (
                          <div className="text-sm text-red-600 mb-1">
                            문제점: {result.issues.join(", ")}
                          </div>
                        )}
                        {result.suggestions.length > 0 && (
                          <div className="text-sm text-blue-600 mb-1">
                            제안: {result.suggestions.join(", ")}
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          AI 평가: {result.aiNotes}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation Questions List */}
              {isLoadingValidation ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {validationQuestions.length > 0 ? (
                    validationQuestions.map((question) => (
                      <div key={question.id} className="border rounded-lg p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                                {getKoreanGrammarType(question.grammar_type)}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                                {getKoreanDifficulty(question.difficulty_level)}
                              </span>
                              {question.validation_status && (
                                <Badge 
                                  variant={
                                    question.validation_status === 'approved' ? 'default' :
                                    question.validation_status === 'rejected' ? 'destructive' :
                                    'outline'
                                  }
                                  className={`text-xs ${
                                    question.validation_status === 'approved' ? 'bg-green-100 text-green-800' :
                                    question.validation_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    question.validation_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    question.validation_status?.startsWith('ai_') ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {question.validation_status === 'approved' ? '✓ 승인됨' :
                                   question.validation_status === 'rejected' ? '✗ 거부됨' :
                                   question.validation_status === 'pending' ? '⏳ 검토 대기' :
                                   question.validation_status?.startsWith('ai_') ? '🤖 AI 검증됨' :
                                   question.validation_status}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium text-lg mb-3">{question.question_text}</h3>
                            
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className={`p-2 rounded ${question.correct_answer === 'A' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                A. {question.option_a}
                              </div>
                              <div className={`p-2 rounded ${question.correct_answer === 'B' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                B. {question.option_b}
                              </div>
                              <div className={`p-2 rounded ${question.correct_answer === 'C' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                C. {question.option_c}
                              </div>
                              <div className={`p-2 rounded ${question.correct_answer === 'D' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                D. {question.option_d}
                              </div>
                            </div>
                            
                            <div className="bg-blue-50 p-3 rounded">
                              <p className="text-sm font-medium text-blue-800 mb-1">정답: {question.correct_answer}</p>
                              <p className="text-sm text-blue-700">{question.explanation}</p>
                            </div>

                            {/* AI 검증 결과 표시 */}
                            {(() => {
                              const aiResult = aiValidationResults.find(result => result.questionId === question.id);
                              
                              if (aiResult) {
                                return (
                                  <div className="mt-3 p-3 rounded border bg-purple-50 border-purple-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-sm font-medium text-purple-800">
                                        🤖 AI 검증 결과
                                      </span>
                                      <Badge 
                                        variant="outline"
                                        className={`text-xs ${
                                          aiResult.score >= 70 ? 'bg-green-100 text-green-800 border-green-300' : 
                                          'bg-orange-100 text-orange-800 border-orange-300'
                                        }`}
                                      >
                                        {aiResult.score}점 ({aiResult.decision === 'approved' ? '자동 승인' : '검토 필요'})
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm">
                                      {aiResult.issues && aiResult.issues.length > 0 && (
                                        <div>
                                          <span className="font-medium text-red-700">🚨 발견된 문제점:</span>
                                          <div className="text-red-600 ml-4">
                                            {aiResult.issues.map((issue: any, index: number) => (
                                              <div key={index}>• {issue}</div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {aiResult.suggestions && aiResult.suggestions.length > 0 && (
                                        <div>
                                          <span className="font-medium text-blue-700">💡 개선 제안:</span>
                                          <div className="text-blue-600 ml-4">
                                            {aiResult.suggestions.map((suggestion: any, index: number) => (
                                              <div key={index}>• {suggestion}</div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {aiResult.aiNotes && (
                                        <div>
                                          <span className="font-medium text-purple-700">📝 AI 종합 평가:</span>
                                          <div className="text-purple-600 ml-4">{aiResult.aiNotes}</div>
                                        </div>
                                      )}
                                      
                                      <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-purple-200">
                                        검증 시간: {new Date().toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else if (isAIValidating && aiValidationProgress.total > 0) {
                                // AI 검증 진행 중
                                return (
                                  <div className="mt-3 p-3 rounded border bg-blue-50 border-blue-200">
                                    <div className="flex items-center gap-2">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                      <span className="text-sm text-blue-700">🤖 AI 검증 대기 중...</span>
                                    </div>
                                  </div>
                                );
                              } else if (!question.validation_status?.startsWith('ai_') && 
                                        question.validation_status !== 'approved' && 
                                        question.validation_status !== 'rejected') {
                                // 아직 검증되지 않은 문제
                                return (
                                  <div className="mt-3 p-3 rounded border bg-gray-50 border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">🤖 AI 검증이 필요한 문제입니다</span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => performAIValidation([question.id])}
                                        disabled={isAIValidating}
                                        className="text-xs"
                                      >
                                        개별 AI 검증
                                      </Button>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return null;
                            })()}
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => validateQuestion(question.id, "rejected", "추가 검토 필요")}
                            disabled={validatingQuestions.has(question.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            {validatingQuestions.has(question.id) ? "처리 중..." : "거절"}
                          </Button>
                          <Button
                            onClick={() => validateQuestion(question.id, "approved")}
                            disabled={validatingQuestions.has(question.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {validatingQuestions.has(question.id) ? "처리 중..." : "승인"}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">검증 대기 중인 문제가 없습니다.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {validationTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setValidationCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={validationCurrentPage === 1}
                  >
                    이전
                  </Button>
                  <span className="px-4 py-2 text-sm">
                    {validationCurrentPage} / {validationTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setValidationCurrentPage((prev) => Math.min(validationTotalPages, prev + 1))}
                    disabled={validationCurrentPage === validationTotalPages}
                  >
                    다음
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">중복 문제 관리</CardTitle>
              <p className="text-gray-600">
                동일한 내용의 문제들을 찾아서 하나만 남기고 삭제할 수 있습니다.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">중복 검사</h3>
                  <p className="text-sm text-gray-600">
                    데이터베이스에서 동일한 문제 텍스트를 가진 문제들을 찾습니다.
                  </p>
                </div>
                <Button 
                  onClick={fetchDuplicateQuestions}
                  disabled={isLoadingDuplicates}
                  className="min-w-[120px]"
                >
                  {isLoadingDuplicates ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      검사 중...
                    </>
                  ) : (
                    "중복 검사"
                  )}
                </Button>
              </div>

              {duplicateGroups.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      발견된 중복 문제: {duplicateGroups.length}개 그룹
                    </h4>
                    <p className="text-sm text-yellow-700">
                      각 그룹에서 하나의 문제만 남기고 나머지는 삭제할 수 있습니다.
                    </p>
                  </div>

                  {duplicateGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-lg">
                          중복 그룹 #{groupIndex + 1} ({group.count}개 문제)
                        </h4>
                        <Badge variant="secondary">
                          {getKoreanGrammarType(group.questions[0]?.grammar_type)}
                        </Badge>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="font-medium text-blue-800 mb-2">문제 내용:</p>
                        <p className="text-blue-700">{group.questionText}</p>
                      </div>

                      <div className="space-y-3">
                        <h5 className="font-medium text-gray-800">중복된 문제들:</h5>
                        {group.questions.map((question: any, questionIndex: number) => (
                          <div 
                            key={question.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">
                                  문제 #{questionIndex + 1}
                                </span>
                                {questionIndex === 0 && (
                                  <Badge variant="default" className="text-xs">
                                    가장 오래된 문제 (권장 유지)
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                ID: {question.id} | 생성일: {new Date(question.created_at).toLocaleDateString('ko-KR')}
                              </div>
                              <div className="text-sm text-gray-600">
                                난이도: {getKoreanDifficulty(question.difficulty_level)}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {questionIndex === 0 ? (
                                <Button
                                  onClick={() => deleteDuplicateQuestions(
                                    group.questions.map((q: any) => q.id),
                                    question.id
                                  )}
                                  disabled={group.questions.some((q: any) => deletingQuestions.has(q.id))}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {group.questions.some((q: any) => deletingQuestions.has(q.id)) ? "처리 중..." : "이것만 유지"}
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => deleteDuplicateQuestions(
                                    group.questions.map((q: any) => q.id),
                                    question.id
                                  )}
                                  disabled={group.questions.some((q: any) => deletingQuestions.has(q.id))}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  {group.questions.some((q: any) => deletingQuestions.has(q.id)) ? "처리 중..." : "이것만 유지"}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-4 border-t">
                        <Button
                          variant="destructive"
                          onClick={() => deleteDuplicateQuestions(
                            group.questions.map((q: any) => q.id).slice(1), // Keep the first (oldest) one
                            group.questions[0].id
                          )}
                          disabled={group.questions.some((q: any) => deletingQuestions.has(q.id))}
                          className="w-full"
                        >
                          {group.questions.some((q: any) => deletingQuestions.has(q.id)) ? 
                            "처리 중..." : 
                            `가장 오래된 문제만 남기고 ${group.count - 1}개 삭제`
                          }
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !isLoadingDuplicates && (
                  <div className="text-center py-8">
                    <div className="text-green-600 text-6xl mb-4">✓</div>
                    <h3 className="text-xl font-semibold text-green-800 mb-2">중복 문제가 없습니다!</h3>
                    <p className="text-gray-600">모든 문제가 고유합니다.</p>
                  </div>
                )
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

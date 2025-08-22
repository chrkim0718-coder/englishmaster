"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, CheckCircle, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  // 컴포넌트 마운트 시 세션 확인
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      console.log("� Session check:", { session: !!session, error })
      
      if (!session) {
        console.log("❌ No session found, redirecting to reset password")
        setError("유효한 세션이 없습니다. 비밀번호 재설정을 다시 요청해주세요.")
        setTimeout(() => {
          router.push("/auth/reset-password")
        }, 3000)
      } else {
        console.log("✅ Session found:", session.user?.email)
      }
    }

    checkSession()
  }, [])

  // 비밀번호 유효성 검사
  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return "비밀번호는 8자 이상이어야 합니다."
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다."
    }
    return ""
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // 비밀번호 유효성 검사
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      // 비밀번호 업데이트
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        console.error("Password update error:", error)
        setError(`비밀번호 업데이트 실패: ${error.message}`)
      } else {
        console.log("✅ Password updated successfully!")
        setIsSuccess(true)
        setTimeout(() => {
          router.push("/auth/login")
        }, 3000)
      }
    } catch (err) {
      console.error("❌ Exception:", err)
      setError("비밀번호 업데이트 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">비밀번호 변경 완료</CardTitle>
          <CardDescription className="text-gray-600">
            비밀번호가 성공적으로 변경되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            새로운 비밀번호로 로그인하실 수 있습니다.
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              3초 후 로그인 페이지로 이동합니다...
            </p>
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              지금 로그인하기
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">새 비밀번호 설정</CardTitle>
        <CardDescription className="text-gray-600">
          새로운 비밀번호를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                새 비밀번호
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="새 비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                8자 이상, 대문자, 소문자, 숫자 포함
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                비밀번호 확인
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-medium rounded-lg h-[60px]"
          >
            {isLoading ? "업데이트 중..." : "비밀번호 변경"}
          </Button>

          <div className="text-center">
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

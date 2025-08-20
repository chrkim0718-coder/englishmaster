"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, BookOpen } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-medium rounded-lg h-[60px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          계정 생성 중...
        </>
      ) : (
        "회원가입"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  const [state, formAction] = useActionState(signUp, null)

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">회원가입</CardTitle>
        <CardDescription className="text-gray-600">이메일과 비밀번호로 계정을 만들어주세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {state.success}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required className="h-12" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <Input id="password" name="password" type="password" required className="h-12" />
            </div>
          </div>

          <SubmitButton />

          <div className="text-center text-gray-600">
            이미 계정이 있으신가요?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
              로그인
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

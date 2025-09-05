
"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Loader2, BookOpen } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { signIn } from "@/lib/actions"

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
          로그인 중...
        </>
      ) : (
        "로그인"
      )}
    </Button>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const [state, formAction] = useActionState(signIn, null)
  const emailRef = useRef<HTMLInputElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogEmail, setDialogEmail] = useState("");
  const [isSending, setIsSending] = useState(false)

  // Handle successful login by redirecting
  useEffect(() => {
    if (state?.success) {
      router.push("/")
    }
  }, [state, router])

  function generateNumericPassword(length = 8) {
    let pw = "";
    for (let i = 0; i < length; i++) {
      pw += Math.floor(Math.random() * 10).toString();
    }
    return pw;
  }

  async function handleSendTempPassword() {
    if (!dialogEmail) {
      toast.error("이메일을 입력하세요.");
      return;
    }
    setIsSending(true);
    const tempPassword = generateNumericPassword(8);
    try {
      const res = await fetch("/api/admin/send-temp-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: dialogEmail, tempPassword })
      });
      const data = await res.json();
      if (res.ok) {
        // 성공 메시지 토스트
        toast.success("임시 비밀번호가 이메일로 전송되었습니다.");
        setTimeout(() => {
          setIsDialogOpen(false);
          setDialogEmail("");
        }, 1000); // 1초 후 다이얼로그 닫기
      } else {
        toast.error(data.error || "임시 비밀번호 전송 실패");
      }
    } catch (e) {
      toast.error("임시 비밀번호 전송 중 오류 발생");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">환영합니다</CardTitle>
          <CardDescription className="text-gray-600">이메일과 비밀번호로 로그인해 주세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            {state?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {state.error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  이메일
                </label>
                <Input id="email" name="email" type="email" placeholder="you@example.com" required className="h-12" ref={emailRef} />
                {/* 프로필 관리 버튼 삭제됨 */}
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <Input id="password" name="password" type="password" required className="h-12" />
              </div>
            </div>

            <SubmitButton />

            <div className="flex justify-between items-center text-gray-600 text-sm mt-2">
              <button
                type="button"
                className="text-blue-600 hover:underline font-medium"
                onClick={() => setIsDialogOpen(true)}
              >
                비밀번호를 잊으셨나요?
              </button>
              <span>
                계정이 없으신가요?{" "}
                <Link href="/auth/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
                  회원가입
                </Link>
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogHeader>
          <DialogTitle>임시 비밀번호 발송</DialogTitle>
          <DialogDescription>가입하신 이메일을 입력하시면 임시 비밀번호가 전송됩니다.</DialogDescription>
        </DialogHeader>
        <DialogContent>
          <Input
            type="email"
            placeholder="you@example.com"
            value={dialogEmail}
            onChange={e => setDialogEmail(e.target.value)}
            autoFocus
            className="h-12"
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSending}>
            취소
          </Button>
          <Button onClick={handleSendTempPassword} disabled={isSending}>
            {isSending ? "전송 중..." : "임시 비밀번호 발송"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}

// NOTE: <Toaster /> 컴포넌트를 app/layout.tsx 또는 app/page.tsx 등 루트에 추가해야 토스트가 정상 동작합니다.

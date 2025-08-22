"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ProfileSettingsProps {
  onPasswordChangeSuccess?: () => void;
}

export default function ProfileSettings({ onPasswordChangeSuccess }: ProfileSettingsProps) {
  const [passwordError, setPasswordError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // 비밀번호 변경
  function handleConfirmPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setConfirmPassword(e.target.value);
    if (newPassword && e.target.value && newPassword !== e.target.value) {
      setPasswordError("새 비밀번호와 일치하지 않습니다.");
    } else {
      setPasswordError("");
    }
  }

  function handleNewPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewPassword(e.target.value);
    if (confirmPassword && e.target.value !== confirmPassword) {
      setPasswordError("새 비밀번호와 일치하지 않습니다.");
    } else {
      setPasswordError("");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호와 일치하지 않습니다.");
      return;
    }
    setIsChanging(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "비밀번호 변경 완료", description: "새 비밀번호로 다시 로그인하세요." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        if (onPasswordChangeSuccess) {
          setTimeout(() => onPasswordChangeSuccess(), 800);
        }
      } else {
        toast({ title: "오류", description: data.error || "비밀번호 변경 실패", variant: "destructive" });
      }
    } finally {
      setIsChanging(false);
    }
  }

  // 회원 탈퇴
  async function handleDeleteAccount() {
    if (!confirm("정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/profile/delete-account", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "탈퇴 완료", description: "계정이 삭제되었습니다." });
        window.location.href = "/auth/login";
      } else {
        toast({ title: "오류", description: data.error || "탈퇴 실패", variant: "destructive" });
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
  <Card className="max-w-md mx-auto mt-8 border-blue-300 shadow-blue-100">
      <CardHeader className="bg-blue-50 rounded-t-lg">
        <CardTitle className="text-blue-700">프로필 관리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-blue-700">현재 비밀번호</label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="border-blue-300 focus:border-blue-500 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block mb-1 font-medium text-blue-700">새 비밀번호</label>
            <Input type="password" value={newPassword} onChange={handleNewPasswordChange} required minLength={6} className="border-blue-300 focus:border-blue-500 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block mb-1 font-medium text-blue-700">새 비밀번호 확인</label>
            <Input type="password" value={confirmPassword} onChange={handleConfirmPasswordChange} required minLength={6} className="border-blue-300 focus:border-blue-500 focus:ring-blue-500" />
            {passwordError && (
              <div className="text-sm text-red-500 mt-1">{passwordError}</div>
            )}
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isChanging || !!passwordError}>
            {isChanging ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
        <hr />
        <Button variant="destructive" className="w-full" onClick={handleDeleteAccount} disabled={isDeleting}>
          {isDeleting ? "탈퇴 중..." : "회원 탈퇴하기"}
        </Button>
      </CardContent>
    </Card>
  );
}

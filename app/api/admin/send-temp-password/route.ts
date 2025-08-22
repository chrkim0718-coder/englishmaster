
import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const { email, tempPassword } = await request.json();
    if (!email || !tempPassword) {
      return NextResponse.json({ success: false, error: "이메일과 임시 비밀번호가 필요합니다." }, { status: 400 });
    }


    // 1. Supabase에서 해당 사용자의 id 찾기 (listUsers는 email 필터가 없으므로 전체 조회 후 email로 찾음)
    const supabase = createServiceClient();
    const { data: userList, error: userListError } = await supabase.auth.admin.listUsers();
    if (userListError || !userList || !userList.users.length) {
      return NextResponse.json({ success: false, error: "사용자 목록을 불러올 수 없습니다." }, { status: 500 });
    }
    const user = userList.users.find((u) => u.email === email);
    if (!user) {
      return NextResponse.json({ success: false, error: "해당 이메일의 사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    // 2. 비밀번호 변경
    const { error: pwError } = await supabase.auth.admin.updateUserById(user.id, { password: tempPassword });
    if (pwError) {
      return NextResponse.json({ success: false, error: "비밀번호 변경 실패" }, { status: 500 });
    }

  // nodemailer 관련 코드 제거됨. 메일 전송 기능이 비활성화되었습니다.
  return NextResponse.json({ success: true, message: "nodemailer 관련 코드가 제거되어 메일은 전송되지 않습니다." });
  } catch (error) {
    console.error("임시 비밀번호 메일 전송 오류:", error);
    return NextResponse.json({ success: false, error: "메일 전송 실패" }, { status: 500 });
  }
}

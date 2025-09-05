import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email, tempPassword } = await request.json();
    if (!email || !tempPassword) {
      return NextResponse.json({ success: false, error: "이메일과 임시 비밀번호가 필요합니다." }, { status: 400 });
    }

    // 1. Supabase에서 해당 사용자의 id 찾기
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

    // 3. nodemailer로 메일 발송
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "engmaster 임시 비밀번호 안내입니다.",
      text: `engmaster 임시 비밀번호는 ${tempPassword} 입니다. `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[임시비밀번호 메일 발송 결과]", info);

    // 4. 로그 테이블에 기록
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const userAgent = request.headers.get("user-agent") || "";
    const { error: logError, data: logData } = await supabase.from("temp_password_logs").insert({
      email,
      ip_address: ip,
      user_agent: userAgent
    });
    if (logError) {
      console.error("[임시비밀번호 로그 DB 에러]", logError);
    } else {
      console.log("[임시비밀번호 로그 DB 성공]", logData);
    }

    return NextResponse.json({ success: true, message: "임시 비밀번호가 메일로 전송되었습니다.", mailInfo: info });
  } catch (error) {
    console.error("임시 비밀번호 메일 전송 오류:", error);
    return NextResponse.json({ success: false, error: "메일 전송 실패" }, { status: 500 });
  }
}

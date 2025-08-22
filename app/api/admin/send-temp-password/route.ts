
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
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

    // 3. 메일 전송
    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT),
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `관리자 <${process.env.BREVO_SMTP_USER}>`,
      to: email,
      subject: "임시 비밀번호 안내",
      html: `<p>임시 비밀번호: <b>${tempPassword}</b></p><p>로그인 후 반드시 비밀번호를 변경해 주세요.</p>`,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("임시 비밀번호 메일 전송 오류:", error);
    return NextResponse.json({ success: false, error: "메일 전송 실패" }, { status: 500 });
  }
}

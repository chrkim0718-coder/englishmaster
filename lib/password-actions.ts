"use server"

import { createClient } from "@supabase/supabase-js"

export async function updatePasswordAction(formData: FormData) {
  console.log("🔄 Server action: updatePasswordAction called")
  
  const password = formData.get('password') as string
  const accessToken = formData.get('accessToken') as string
  
  if (!password || !accessToken) {
    return { 
      success: false, 
      error: "비밀번호와 토큰이 필요합니다." 
    }
  }

  try {
    // Service Role 클라이언트
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log("🔄 Validating token...")
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
    
    if (userError || !user) {
      console.error("❌ Token validation failed:", userError?.message)
      return { 
        success: false, 
        error: "유효하지 않은 토큰입니다." 
      }
    }

    console.log("✅ User validated:", user.email)

    // 비밀번호 업데이트
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password }
    )

    if (updateError) {
      console.error("❌ Password update failed:", updateError.message)
      return { 
        success: false, 
        error: updateError.message 
      }
    }

    console.log("✅ Password updated successfully")
    return { 
      success: true, 
      message: "비밀번호가 성공적으로 변경되었습니다." 
    }

  } catch (error) {
    console.error("❌ Server action error:", error)
    return { 
      success: false, 
      error: "서버 오류가 발생했습니다." 
    }
  }
}

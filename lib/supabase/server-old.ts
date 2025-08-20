import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { cache } from "react"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Create a cached version of the Supabase client for Server Components
export const createClient = cache(async () => {
  if (!isSupabaseConfigured) {
    console.warn("Supabase environment variables are not set. Using dummy client.")
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
    }
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // 쿠키 설정 시 오류 방지
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch (error) {
              // 쿠키 설정 실패 시 무시
              console.warn(`Failed to set cookie ${name}:`, error)
            }
          })
        },
      },
    }
  )
})

// Create a simpler Supabase client for API routes
export const createSimpleClient = async () => {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase environment variables are not configured")
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // API 라우트에서는 쿠키 설정을 더 안전하게 처리
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch (error) {
              // 쿠키 설정 실패 시 로그만 남기고 계속 진행
              console.warn(`Failed to set cookie ${name} in API route`)
            }
          })
        },
      },
    }
  )
}

// Helper function to get user from cookies manually
export const getApiUser = async (supabase: any) => {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-zetkxywjbjdvuyxeolue-auth-token')?.value
    
    if (!accessToken) {
      return { data: { user: null }, error: { message: 'No access token found' } }
    }

    const { data, error } = await supabase.auth.getUser(accessToken)
    return { data, error }
  } catch (error) {
    return { data: { user: null }, error }
  }
}

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

// Safe cookie parser that handles Supabase auth tokens
const safeParseCookie = (value: string) => {
  // Supabase auth tokens are base64 encoded and don't need JSON parsing
  if (value.startsWith('base64-')) {
    return value
  }
  
  try {
    return JSON.parse(value)
  } catch {
    // If it's not valid JSON, return as-is
    return value
  }
}

// Create a cached version of the Supabase client for Server Components
export const createClient = cache(async () => {
  if (!isSupabaseConfigured) {
    console.warn("Supabase environment variables are not set. Using dummy client.")
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
      }),
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          try {
            const allCookies = cookieStore.getAll()
            // Process cookies to handle Supabase tokens properly
            return allCookies.map(cookie => ({
              ...cookie,
              value: safeParseCookie(cookie.value)
            }))
          } catch (error) {
            console.warn("Failed to get cookies:", error)
            return []
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                // For Supabase auth cookies, use special handling
                if (name.includes('supabase') || name.includes('auth')) {
                  cookieStore.set(name, value, {
                    ...options,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    httpOnly: false,
                    path: '/',
                  })
                } else {
                  cookieStore.set(name, value, options)
                }
              } catch (error) {
                console.warn(`Failed to set cookie ${name}:`, error)
              }
            })
          } catch (error) {
            console.warn("Failed to set cookies:", error)
          }
        },
      },
    }
  )
})

// Create a Supabase client for API routes with better error handling
export const createApiClient = async () => {
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
          try {
            return cookieStore.getAll()
          } catch (error) {
            console.warn("API: Failed to get cookies:", error)
            return []
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, {
                  ...options,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                })
              } catch (error) {
                console.warn(`API: Failed to set cookie ${name}:`, error)
              }
            })
          } catch (error) {
            console.warn("API: Failed to set cookies:", error)
          }
        },
      },
    }
  )
}

// Create a simple client without cookie handling for basic operations
export const createBasicClient = () => {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase environment variables are not configured")
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

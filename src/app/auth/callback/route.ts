import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    // This is the correct way to handle cookies in a Route Handler.
    // --- THIS IS THE FIX ---
    // Change the redirect URL from '/confirm-signup' to the root '/'
    const response = NextResponse.redirect(new URL('/', request.url))
    // --- END OF FIX ---

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Exchange the code for a session. This will automatically set the auth
    // cookie on the response object.
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
  }

  // If there is an error or no code, redirect to an error page.
  const redirectUrl = new URL('/login', request.url)
  redirectUrl.searchParams.set('message', 'Error: Could not process authentication. Please try again.')
  return NextResponse.redirect(redirectUrl)
}

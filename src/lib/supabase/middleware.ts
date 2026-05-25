import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth', '/api/auth']

// Routes that require authentication
const PROTECTED_PREFIXES = ['/', '/fuel', '/sales', '/employees', '/shifts', '/payroll', '/expenses', '/fraud', '/ai', '/reports', '/settings', '/security']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST be called before any other supabase calls
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Allow public routes
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  if (isPublic) return supabaseResponse

  // Allow Next.js internals and static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return supabaseResponse
  }

  const isDemoAllowed = process.env.NEXT_PUBLIC_ALLOW_DEMO === 'true' || process.env.NODE_ENV === 'development'
  const isDemo = isDemoAllowed && request.cookies.get('demo-session')?.value === 'true'

  // Block unauthenticated access to all other routes
  if (!user && !isDemo) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname) // preserve intended destination
    return NextResponse.redirect(url)
  }

  // User authenticated — add security headers
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return supabaseResponse
}

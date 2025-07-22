import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production' && 
      request.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    )
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/pricing',
    '/marketplace',
    '/api/webhooks',
    '/api/emails/track',
    '/api/v1' // External API routes
  ]

  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check authentication for protected routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    // Redirect to login for pages
    if (!pathname.startsWith('/api')) {
      const url = new URL('/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    
    // Return 401 for API routes
    return NextResponse.json(
      { error: 'Não autorizado - Token inválido' }, 
      { status: 401 }
    )
  }

  // Role-based access control for admin routes
  if (pathname.startsWith('/admin')) {
    if (token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado - Privilégios insuficientes' }, 
        { status: 403 }
      )
    }
  }

  // Rate limiting headers for API routes
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next()
    
    // Add security headers for API responses
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
/**
 * Next.js Middleware for Route Protection
 * 
 * This middleware runs on every request and enforces authentication rules:
 * - Protected routes redirect to /login if not authenticated
 * - Public auth routes redirect to / if authenticated
 * - Public routes allow access for everyone
 * 
 * Token is read from the cognito_id_token cookie (set by AuthContext)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isProtectedRoute, isPublicAuthRoute, getRedirectRoute, isTokenValid } from '@/lib/auth/routes';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get the token from cookies (set by AuthContext on line 236)
  const idToken = request.cookies.get('cognito_id_token')?.value ?? null;
  const isAuthenticated = isTokenValid(idToken);

  // Determine if redirect is needed
  const redirectTo = getRedirectRoute(pathname, isAuthenticated);

  if (redirectTo) {
    // Redirect to the appropriate route
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    
    // Preserve query parameters when redirecting to login
    // This allows returning to the original page after login
    if (redirectTo === '/login' && pathname !== '/login') {
      url.searchParams.set('from', pathname);
    }

    return NextResponse.redirect(url);
  }

  // No redirect needed, continue to the requested route
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 * This improves performance by skipping middleware for static files, etc.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
/**
 * Route configuration and protection helpers for middleware
 * Defines which routes are protected, public, and redirect behavior
 */

/**
 * Routes that require authentication to access
 * If user is not authenticated, they'll be redirected to /login
 */
export const PROTECTED_ROUTES = [
  '/profile',
  '/plants',
  '/calendar',
  '/diagnose',
  '/settings',
];

/**
 * Routes that should redirect to home if user is already authenticated
 * Prevents logged-in users from seeing login/register pages
 */
export const PUBLIC_AUTH_ROUTES = [
  '/login',
  '/register',
  '/confirm-signup',
  '/forgot-password',
  '/reset-password',
];

/**
 * Routes that are completely public (no redirect needed)
 * Users can access these whether logged in or not
 */
export const PUBLIC_ROUTES = [
  '/',
  '/favicon.ico',
  '/sw.js',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
];

/**
 * Check if a route is protected (requires authentication)
 * @param pathname - The request pathname
 * @returns true if the route requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a route is a public auth route (login/register)
 * @param pathname - The request pathname
 * @returns true if the route is a public auth page
 */
export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a route is completely public
 * @param pathname - The request pathname
 * @returns true if the route is public
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route);
}

/**
 * Check if a token in the request is valid
 * @param token - The ID token from cookies
 * @returns true if token exists (basic check; full validation happens server-side)
 */
export function isTokenValid(token: string | null): boolean {
  return token !== null && token !== undefined && token.length > 0;
}

/**
 * Get the route to redirect to based on auth state
 * @param pathname - Current pathname
 * @param isAuthenticated - Whether user has valid token
 * @returns The pathname to redirect to, or null if no redirect needed
 */
export function getRedirectRoute(
  pathname: string,
  isAuthenticated: boolean
): string | null {
  // If authenticated user tries to access login/register/confirm-signup, redirect to home
  if (isAuthenticated && isPublicAuthRoute(pathname)) {
    return '/';
  }

  // If unauthenticated user tries to access protected route, redirect to login
  if (!isAuthenticated && isProtectedRoute(pathname)) {
    return '/login';
  }

  // No redirect needed
  return null;
}
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isProtectedRoute, isPublicAuthRoute } from '@/lib/auth/routes';
import { Loader2 } from 'lucide-react';

/**
 * Client-side route guard that replaces Next.js middleware for static export.
 *
 * With `output: 'export'`, middleware does not run at request time.
 * This component enforces the same auth-based redirect rules client-side:
 * - Protected routes redirect to /login when unauthenticated
 * - Public auth routes (login, register, etc.) redirect to / when authenticated
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthenticated = !isLoading && user !== null;

  // Compute redirect targets once per render to avoid duplicate route checks
  const shouldRedirectToHome = !isLoading && isAuthenticated && isPublicAuthRoute(pathname);
  const shouldRedirectToLogin = !isLoading && !isAuthenticated && isProtectedRoute(pathname);
  const needsRedirect = shouldRedirectToHome || shouldRedirectToLogin;

  // Perform the redirect as a side effect
  useEffect(() => {
    if (isLoading) return;

    if (shouldRedirectToHome) {
      router.replace('/');
      return;
    }

    if (shouldRedirectToLogin) {
      const loginUrl = `/login?from=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
    }
  }, [isLoading, shouldRedirectToHome, shouldRedirectToLogin, pathname, router]);

  // Show loading state while auth is being determined or redirect is pending
  if (isLoading || needsRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

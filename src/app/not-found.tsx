'use client';

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Leaf, SearchX, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

function DynamicRouteLoading() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    </AppLayout>
  );
}

// Dynamically import page components for client-side routing of dynamic routes
// These are only loaded when the URL matches a dynamic route pattern
const PlantDetailPageClient = dynamic(
  () => import('./plants/[id]/PlantDetailPageClient'),
  { loading: () => <DynamicRouteLoading /> }
);
const EditPlantPageClient = dynamic(
  () => import('./plants/[id]/edit/EditPlantPageClient'),
  { loading: () => <DynamicRouteLoading /> }
);

/**
 * Map of known static routes to their dynamically-imported page components.
 * When CloudFront serves 404.html for these routes (because S3 can't resolve
 * directory paths to index.html), we render the correct page component directly
 * via dynamic import — the same proven pattern used for dynamic routes above.
 *
 * This replaces the previous router.replace() approach, which was unreliable
 * from the not-found page context: the Next.js App Router would not complete
 * the navigation when the browser URL already matched the target path.
 */
const STATIC_PAGE_COMPONENTS: Record<string, ComponentType> = {
  '/': dynamic(() => import('./page'), { loading: () => <DynamicRouteLoading /> }),
  '/login': dynamic(() => import('./login/page'), { loading: () => <DynamicRouteLoading /> }),
  '/register': dynamic(() => import('./register/page'), { loading: () => <DynamicRouteLoading /> }),
  '/confirm-signup': dynamic(() => import('./confirm-signup/page'), { loading: () => <DynamicRouteLoading /> }),
  '/forgot-password': dynamic(() => import('./forgot-password/page'), { loading: () => <DynamicRouteLoading /> }),
  '/reset-password': dynamic(() => import('./reset-password/page'), { loading: () => <DynamicRouteLoading /> }),
  '/calendar': dynamic(() => import('./calendar/page'), { loading: () => <DynamicRouteLoading /> }),
  '/profile': dynamic(() => import('./profile/page'), { loading: () => <DynamicRouteLoading /> }),
  '/settings': dynamic(() => import('./settings/page'), { loading: () => <DynamicRouteLoading /> }),
  '/diagnose': dynamic(() => import('./diagnose/page'), { loading: () => <DynamicRouteLoading /> }),
  '/plants/new': dynamic(() => import('./plants/new/page'), { loading: () => <DynamicRouteLoading /> }),
};

const KNOWN_STATIC_ROUTES = Object.keys(STATIC_PAGE_COMPONENTS);

/**
 * Smart 404 page that handles client-side routing for both dynamic and
 * static routes when served as a CloudFront fallback.
 *
 * With Next.js static export (`output: 'export'`) deployed to S3 + CloudFront:
 *
 * 1. **Dynamic routes** (e.g. `/plants/[id]`): Cannot be pre-rendered for every
 *    possible ID. When CloudFront serves this 404 page, we match the URL and
 *    render the appropriate page component directly via dynamic import.
 *
 * 2. **Static routes** (e.g. `/calendar/`, `/`): S3 REST API origins return 403
 *    for directory paths because they don't auto-resolve `index.html`. CloudFront
 *    catches the 403 and serves this 404 page. We render the correct page
 *    component directly via dynamic import — the same approach used for dynamic
 *    routes, which is more reliable than router.replace() from the not-found
 *    page context.
 */
export default function NotFound() {
  const { t } = useLanguage();
  const [routeMatch, setRouteMatch] = useState<
    | { type: 'plant-detail'; id: string }
    | { type: 'plant-edit'; id: string }
    | { type: 'static-page'; route: string }
    | { type: 'not-found' }
    | null
  >(null);

  useEffect(() => {
    const pathname = window.location.pathname;
    // Remove trailing slash for consistent matching
    const normalizedPath = pathname.endsWith('/') && pathname !== '/'
      ? pathname.slice(0, -1)
      : pathname;

    // Match /plants/[id]/edit — render directly via dynamic import
    const editMatch = normalizedPath.match(/^\/plants\/([^/]+)\/edit$/);
    if (editMatch && editMatch[1] !== 'placeholder') {
      setRouteMatch({ type: 'plant-edit', id: editMatch[1] });
      return;
    }

    // Match /plants/[id] — render directly via dynamic import
    const detailMatch = normalizedPath.match(/^\/plants\/([^/]+)$/);
    if (detailMatch && detailMatch[1] !== 'placeholder' && detailMatch[1] !== 'new') {
      setRouteMatch({ type: 'plant-detail', id: detailMatch[1] });
      return;
    }

    // Match known static routes (including root '/') — render directly via
    // dynamic import. This is more reliable than router.replace() which fails
    // from the not-found page context when the URL already matches the target.
    if (KNOWN_STATIC_ROUTES.includes(normalizedPath)) {
      setRouteMatch({ type: 'static-page', route: normalizedPath });
      return;
    }

    // No route matched — show actual 404
    setRouteMatch({ type: 'not-found' });
  }, []);

  // Still determining the route
  if (routeMatch === null) {
    return <DynamicRouteLoading />;
  }

  // Render the matched static page component directly
  if (routeMatch.type === 'static-page') {
    const PageComponent = STATIC_PAGE_COMPONENTS[routeMatch.route];
    if (PageComponent) return <PageComponent />;
  }

  // Render the matched dynamic route component
  if (routeMatch.type === 'plant-detail') {
    return <PlantDetailPageClient plantId={routeMatch.id} />;
  }

  if (routeMatch.type === 'plant-edit') {
    return <EditPlantPageClient plantId={routeMatch.id} />;
  }

  // Actual 404 page
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <div className="relative mb-8">
          <Leaf className="h-32 w-32 text-primary/20" />
          <SearchX className="h-16 w-16 text-destructive absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">{t('notFoundPage.title')}</h2>
        <p className="text-muted-foreground mb-8">{t('notFoundPage.description')}</p>
        <Link href="/" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          {t('notFoundPage.backToHomepage')}
        </Link>
      </div>
    </AppLayout>
  );
}
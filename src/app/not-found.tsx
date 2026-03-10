'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Leaf, SearchX, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

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

function DynamicRouteLoading() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    </AppLayout>
  );
}

/**
 * Smart 404 page that also handles client-side routing for dynamic routes.
 *
 * With Next.js static export (`output: 'export'`), dynamic routes like
 * `/plants/[id]` cannot be pre-rendered for every possible ID. When
 * CloudFront serves this 404 page as a fallback for missing paths,
 * we check the actual browser URL and render the appropriate page
 * component client-side if it matches a known dynamic route pattern.
 */
export default function NotFound() {
  const { t } = useLanguage();
  const [routeMatch, setRouteMatch] = useState<
    | { type: 'plant-detail'; id: string }
    | { type: 'plant-edit'; id: string }
    | { type: 'not-found' }
    | null
  >(null);

  useEffect(() => {
    const pathname = window.location.pathname;
    // Remove trailing slash for consistent matching
    const normalizedPath = pathname.endsWith('/') && pathname !== '/'
      ? pathname.slice(0, -1)
      : pathname;

    // Match /plants/[id]/edit
    const editMatch = normalizedPath.match(/^\/plants\/([^/]+)\/edit$/);
    if (editMatch && editMatch[1] !== 'placeholder') {
      setRouteMatch({ type: 'plant-edit', id: editMatch[1] });
      return;
    }

    // Match /plants/[id]
    const detailMatch = normalizedPath.match(/^\/plants\/([^/]+)$/);
    if (detailMatch && detailMatch[1] !== 'placeholder' && detailMatch[1] !== 'new') {
      setRouteMatch({ type: 'plant-detail', id: detailMatch[1] });
      return;
    }

    // No dynamic route matched — show actual 404
    setRouteMatch({ type: 'not-found' });
  }, []);

  // Still determining the route
  if (routeMatch === null) {
    return <DynamicRouteLoading />;
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
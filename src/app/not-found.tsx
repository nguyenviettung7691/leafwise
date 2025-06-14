'use client'; // This is a client component

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext'; // Import useLanguage
import { Leaf, SearchX } from 'lucide-react'; // Import icons
import { AppLayout } from '@/components/layout/AppLayout'; // Optional: Use your AppLayout for consistent styling

export default function NotFound() {
  const { t } = useLanguage(); // Use the language hook

  return (
    // You can wrap it in your AppLayout for consistent look and feel
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
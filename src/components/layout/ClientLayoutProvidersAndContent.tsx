
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';
import { PlantDataProvider } from '@/contexts/PlantDataContext';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { ProgressBar } from '@/components/layout/ProgressBar';
import { Toaster } from '@/components/ui/toaster';
import { NetworkStatusIndicator } from '@/components/layout/NetworkStatusIndicator';
import { InstallPrompt } from '@/components/layout/InstallPrompt';
import { Amplify } from 'aws-amplify';
import outputs from '../../../amplify_outputs.json';

// Configure Amplify client-side
Amplify.configure(outputs, {
  ssr: true // Keep ssr: true for potential future SSR needs
});

export function ClientLayoutProvidersAndContent({ children }: { children: ReactNode }) {
  const { language } = useLanguage();

  // Dynamically update the lang attribute on the <html> tag
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Manually register the service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[DEV] Service Worker registered with scope:', registration.scope);
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <PlantDataProvider>
          <ProgressProvider>
            <ProgressBar />
            {children}
            <Toaster />
            <NetworkStatusIndicator />
            <InstallPrompt />
          </ProgressProvider>
        </PlantDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

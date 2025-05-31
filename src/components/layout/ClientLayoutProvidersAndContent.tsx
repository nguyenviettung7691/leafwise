
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
import { Amplify } from 'aws-amplify'; // Import Amplify
import outputs from '@root/amplify_outputs.json'; // Import outputs

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
          </ProgressProvider>
        </PlantDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

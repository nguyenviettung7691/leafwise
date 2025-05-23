
'use client'; // Add 'use client' to use hooks

// import type {Metadata, Viewport} from 'next'; // Removed
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { ProgressBar } from '@/components/layout/ProgressBar';
import { PlantDataProvider } from '@/contexts/PlantDataContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Removed static metadata and viewport exports as they are not allowed in client components.
// Manifest link and theme-color meta tags should be handled in <head> directly or via PWA plugin.
/*
export const metadata: Metadata = {
  title: 'LeafWise - Plant Care Management',
  description: 'Your personal plant care assistant.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#32CD32' },
    { media: '(prefers-color-scheme: dark)', color: '#1A202C' },
  ],
};
*/

// Create a wrapper component for the main content to access language context
function AppContent({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage(); // Get language here

  return (
    <html lang={language} className="h-full" suppressHydrationWarning>
      <head>
        {/* PWA manifest link should be here if not auto-injected by PWA plugin */}
        {/* <link rel="manifest" href="/manifest.json" /> */}
        {/* Theme color meta tags */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#32CD32" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1A202C" />
        <link rel="apple-touch-icon" href="https://placehold.co/192x192.png" data-ai-hint="logo appicon"/>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <PlantDataProvider>
                <ProgressProvider>
                  <ProgressBar />
                  {children}
                  <Toaster />
                </ProgressProvider>
              </PlantDataProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // LanguageProvider was moved inside AppContent to be a child of ThemeProvider,
  // but for RootLayout to provide it to AppContent, it should wrap AppContent.
  // The structure inside AppContent for providers is: Language -> Auth -> PlantData -> Progress
  // This means LanguageProvider can be here.
  return (
    <AppContent>{children}</AppContent>
  );
}

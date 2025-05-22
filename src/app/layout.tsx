
import type {Metadata, Viewport} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { ProgressBar } from '@/components/layout/ProgressBar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="https://placehold.co/192x192.png" data-ai-hint="logo appicon"/>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider> {/* LanguageProvider now wraps AuthProvider */}
            <AuthProvider>
              <ProgressProvider>
                <ProgressBar />
                {children}
                <Toaster />
              </ProgressProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

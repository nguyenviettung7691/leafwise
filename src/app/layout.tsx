
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ClientLayoutProvidersAndContent } from '@/components/layout/ClientLayoutProvidersAndContent';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// RootLayout is now a Server Component by default (no 'use client')
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    // Initial lang and font variables set here for SSR
    // ClientLayoutProvidersAndContent will update lang dynamically on the client
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#32CD32" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1A202C" />
        <link rel="apple-touch-icon" href="https://placehold.co/192x192.png" data-ai-hint="logo appicon"/>
        {/* manifest.json should be linked automatically by PWA plugin or added here if not */}
        {/* <link rel="manifest" href="/manifest.json" /> */}
      </head>
      <body className="antialiased h-full">
        <LanguageProvider>
          <ClientLayoutProvidersAndContent>
            {children}
          </ClientLayoutProvidersAndContent>
        </LanguageProvider>
      </body>
    </html>
  );
}

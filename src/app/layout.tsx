
import type { ReactNode } from 'react';
import type { Metadata } from 'next'; // Import Metadata type
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

// Add metadata export for SEO and PWA discoverability
export const metadata: Metadata = {
  title: 'LeafWise - Plant Care Management',
  description: 'Your personal plant care assistant, helping you identify, diagnose, and care for your plants with AI-powered insights.',
  manifest: '/manifest.json',
  icons: {
    apple: 'https://placehold.co/192x192.png', // Ensure this points to your actual apple-touch-icon
    icon: '/favicon.ico', // Or your main favicon
  },
};

// RootLayout is a Server Component
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* PWA theme colors for light/dark mode */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#32CD32" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1A202C" />
      </head>
      <body className="antialiased h-full">
        {/* LanguageProvider needs to wrap ClientLayoutProvidersAndContent for client-side lang updates */}
        <LanguageProvider>
          <ClientLayoutProvidersAndContent>
            {children}
          </ClientLayoutProvidersAndContent>
        </LanguageProvider>
      </body>
    </html>
  );
}

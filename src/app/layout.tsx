
import type {Metadata, Viewport} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';

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
  manifest: '/manifest.json', // Link to the manifest file
};

// Add viewport configuration for PWA theme color and other properties
export const viewport: Viewport = {
  themeColor: [ // Provide light and dark theme colors
    { media: '(prefers-color-scheme: light)', color: '#32CD32' }, // Lime Green for light
    { media: '(prefers-color-scheme: dark)', color: '#1A202C' }, // Example dark theme color, adjust as needed
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
        {/* Added suppressHydrationWarning for next-themes */}
        {/* Recommended for PWA: Apple touch icon */}
        <link rel="apple-touch-icon" href="https://placehold.co/192x192.png" data-ai-hint="logo appicon"/>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LanguageProvider>
              {children}
              <Toaster />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

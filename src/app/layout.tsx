
import type {Metadata, Viewport} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from '@/context/LanguageContext'; // Added LanguageProvider

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
  themeColor: '#32CD32', // Matches the primary color
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Recommended for PWA: Apple touch icon */}
        <link rel="apple-touch-icon" href="https://placehold.co/192x192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <LanguageProvider> {/* Added LanguageProvider */}
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}

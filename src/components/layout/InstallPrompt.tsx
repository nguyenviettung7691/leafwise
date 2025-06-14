'use client'; // This is a Client Component

import { useState, useEffect } from 'react';
import { Leaf, Download } from 'lucide-react';

const INSTALL_PROMPT_DISMISSED_KEY = 'installPromptDismissed';

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setIsIOS(
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
      );
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const dismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);

    if (!dismissed && !window.matchMedia('(display-mode: standalone)').matches) {
        setShowPrompt(true); // Show if not dismissed and not standalone
        const timer = setTimeout(() => {
          setShowPrompt(false);
          // Optionally, mark as dismissed after timeout if user didn't interact
          // localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
        }, 15000); // Hide after 15 seconds
        return () => clearTimeout(timer);
      } else {
        setShowPrompt(false); // Hide if dismissed or already standalone
      }
    }
  }, []);

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 p-4 bg-card border border-border rounded-lg shadow-lg max-w-sm text-center">
      <h3 className="text-lg font-semibold mb-2">Install App</h3>
      <div>
        <div className='relative inline-block m-auto'>
          <Leaf className="h-14 w-14 text-primary/20" />
          <Download className="h-8 w-8 text-accent absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Add LeafWise to your home screen for a better experience.</p>
      {/* You would typically trigger the browser's native install prompt here */}
      {/* For simplicity, this example just shows the message */}
      {isIOS && (
        <p className="text-xs text-muted-foreground mt-2">
          To install on iOS, tap the share button
          <span role="img" aria-label="share icon">
            {' '}
            ⎋{' '}
          </span>
          and then "Add to Home Screen"
          <span role="img" aria-label="plus icon">
            {' '}
            ➕{' '}
          </span>.
        </p>
      )}
       {/* Add a close button */}
       <button
         className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
         onClick={() => {
           setShowPrompt(false);
           localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
         }}
         aria-label="Close install prompt"
       >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
       </button>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

export function usePWAStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      if (typeof window !== 'undefined') {
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
      }
    };

    checkStandalone(); // Initial check

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);

    return () => {
      mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, []);

  return isStandalone;
}

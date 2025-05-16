
'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

// Configure NProgress
if (typeof window !== 'undefined') {
  NProgress.configure({ showSpinner: false }); // Use default trickle speed
}

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePathRef = useRef<string | null>(null);

  useEffect(() => {
    const newPath = `${pathname}?${searchParams.toString()}`;

    // Only act if the path has actually changed
    if (activePathRef.current !== newPath) {
      // If NProgress is somehow still active from a previous navigation (e.g. interrupted),
      // force it to complete immediately before starting a new one.
      if (NProgress.status && NProgress.status > 0 && NProgress.status < 1) {
        NProgress.done(true); // true forces completion without animation
      }
      
      NProgress.start(); // This will use the trickle effect for indeterminate progress
      activePathRef.current = newPath; // Mark this path as the one that started NProgress
    }

    // The cleanup function will be called when this effect is about to re-run
    // due to path changes, or when the component unmounts.
    return () => {
      // Only call NProgress.done() if this cleanup corresponds to the path
      // that was active when NProgress was started by this effect instance.
      // This prevents a premature .done() if another navigation starts very quickly.
      if (activePathRef.current === newPath) {
        NProgress.done();
        activePathRef.current = null; // Clear the active path once its progress is done
      }
    };
  }, [pathname, searchParams]); // Re-run on any path or search param change

  return null; // This component doesn't render anything itself
}

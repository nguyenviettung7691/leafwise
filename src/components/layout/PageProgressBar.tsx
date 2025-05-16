
'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

if (typeof window !== 'undefined') {
  NProgress.configure({ showSpinner: false, trickleSpeed: 200 }); // Faster trickle
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
      
      // console.log(`NProgress.start() for: ${newPath}`);
      NProgress.start();
      activePathRef.current = newPath; // Mark this path as the one that started NProgress
    }

    // The cleanup function will be called when this effect is about to re-run
    // due to path changes, or when the component unmounts.
    return () => {
      // Only call NProgress.done() if this cleanup corresponds to the path
      // that was active when NProgress was started by this effect instance.
      // This prevents a premature .done() if another navigation starts very quickly.
      if (activePathRef.current === newPath) {
        // console.log(`NProgress.done() for: ${newPath}`);
        NProgress.done();
        activePathRef.current = null; // Clear the active path once its progress is done
      }
    };
  }, [pathname, searchParams]); // Re-run when path or search params change

  return null;
}

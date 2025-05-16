
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

// Configure NProgress if needed (optional)
// NProgress.configure({ showSpinner: false });

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.start();

    return () => {
      NProgress.done();
    };
  }, [pathname, searchParams]);

  return null; // NProgress injects its own DOM elements
}

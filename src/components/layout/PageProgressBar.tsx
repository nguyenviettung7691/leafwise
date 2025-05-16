'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

// Configure NProgress once when the module is loaded on the client side
if (typeof window !== 'undefined') {
  NProgress.configure({ showSpinner: false });
}

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.start();
    // console.log('NProgress started for:', pathname, searchParams.toString()); // For debugging

    return () => {
      NProgress.done();
      // console.log('NProgress done for (cleanup):', pathname, searchParams.toString()); // For debugging
    };
  }, [pathname, searchParams]);

  return null;
}

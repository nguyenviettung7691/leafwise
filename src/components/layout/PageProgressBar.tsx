// src/components/layout/PageProgressBar.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | undefined;
    let finishTimeout: NodeJS.Timeout | undefined;
    let hideTimeout: NodeJS.Timeout | undefined;

    const startLoading = () => {
      // Clear any pending timeouts from previous animations
      if (progressInterval) clearInterval(progressInterval);
      if (finishTimeout) clearTimeout(finishTimeout);
      if (hideTimeout) clearTimeout(hideTimeout);
      
      setIsLoading(true);
      setProgress(10); // Start with a small amount of progress
      
      let currentProgress = 10;
      progressInterval = setInterval(() => {
        currentProgress += Math.random() * 10 + 5; // Increment randomly
        if (currentProgress >= 90) {
          currentProgress = 90; // Cap at 90% until completion
          if (progressInterval) clearInterval(progressInterval);
          // Automatically trigger finishLoading after it reaches 90%
          finishTimeout = setTimeout(finishLoading, 200); // Short delay before completing to 100%
        }
        setProgress(currentProgress);
      }, 250); // Adjust interval for desired speed
    };

    const finishLoading = () => {
      if (progressInterval) clearInterval(progressInterval); // Ensure interval is cleared
      setProgress(100); // Complete the progress
      
      // Hide the progress bar after a short delay
      hideTimeout = setTimeout(() => {
        setIsLoading(false);
        setProgress(0); // Reset for next navigation
      }, 500); // Delay to show completion
    };

    const currentPath = `${pathname}?${searchParams.toString()}`;

    // Trigger on path change, but not on initial render of the component itself.
    // Only trigger if the actual path string has changed.
    if (previousPathRef.current !== null && previousPathRef.current !== currentPath) {
      startLoading();
    }
    
    previousPathRef.current = currentPath; // Update the previous path with the current one

    return () => {
      // Cleanup timeouts and intervals when the component unmounts or dependencies change
      if (progressInterval) clearInterval(progressInterval);
      if (finishTimeout) clearTimeout(finishTimeout);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [pathname, searchParams]); // Listen to pathname and searchParams to detect navigation

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[9999]">
      <Progress
        value={progress}
        className="w-full h-full rounded-none bg-transparent"
      />
    </div>
  );
}

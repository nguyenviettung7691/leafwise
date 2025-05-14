
// src/components/layout/PageProgressBar.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

const ANIMATION_TARGET_PROGRESS = 85; // Progress to reach and hold
const ANIMATION_DURATION_MS = 2000; // Time to reach target progress (e.g., 2 seconds)
const FINISH_ANIMATION_DURATION_MS = 300; // Time to show 100% before hiding

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
  };

  const startLoadingAnimation = () => {
    clearTimers();
    setIsVisible(true);
    setProgress(0); // Reset progress

    // Short delay to ensure reset is painted, then start animation
    setTimeout(() => {
      if (!isVisible && progress === 0) { // Check if still relevant to start
         setProgress(10); // Initial small jump
      } else {
         setProgress(10);
      }

      let currentProgress = 10;
      const steps = ANIMATION_DURATION_MS / 100; // Number of steps if interval is 100ms
      const increment = (ANIMATION_TARGET_PROGRESS - 10) / steps;

      progressIntervalRef.current = setInterval(() => {
        currentProgress += increment;
        if (currentProgress >= ANIMATION_TARGET_PROGRESS) {
          setProgress(ANIMATION_TARGET_PROGRESS);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        } else {
          setProgress(currentProgress);
        }
      }, 100);
    }, 10); // Small delay before starting the animation
  };

  const finishLoadingAnimation = () => {
    clearTimers();

    // Only run finish animation if it was actually visible/loading
    if (isVisible || progress > 0) {
      setProgress(100);
      finishTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setProgress(0); // Reset for the next load
      }, FINISH_ANIMATION_DURATION_MS);
    } else {
      // If not visible, just ensure state is clean
      setIsVisible(false);
      setProgress(0);
    }
  };

  useEffect(() => {
    // Start loading animation when path changes
    startLoadingAnimation();

    // Finish loading animation when the component unmounts or path changes again (cleanup)
    return () => {
      finishLoadingAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]); // Effect dependencies

  if (!isVisible) {
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

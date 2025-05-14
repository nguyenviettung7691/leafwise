
// src/components/layout/PageProgressBar.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

const INITIAL_PROGRESS = 10; // Start with a small visible progress
const ANIMATION_TARGET_PROGRESS = 90; // Animate up to this value during navigation
const ANIMATION_DURATION_MS = 2500; // Time to reach target progress (approx)
const FINISH_ANIMATION_DURATION_MS = 200; // Time to show 100% before hiding

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  // Refs for managing timers
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to clear all timers
  const clearAllTimers = () => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    // This effect runs when pathname or searchParams change, indicating a navigation.

    // 1. Clear any ongoing animations or finish timeouts from previous navigations.
    // This is important if the user navigates again quickly.
    clearAllTimers();

    // 2. Immediately show the progress bar and set initial progress.
    // This should make the bar appear as soon as the navigation intent is registered.
    setIsVisible(true);
    setProgress(INITIAL_PROGRESS);

    // 3. Start animating the progress towards the target.
    let currentProgress = INITIAL_PROGRESS;
    // Calculate increment based on updating roughly every 100ms
    const updateInterval = 100;
    const steps = Math.max(1, ANIMATION_DURATION_MS / updateInterval);
    const increment = (ANIMATION_TARGET_PROGRESS - INITIAL_PROGRESS) / steps;

    animationIntervalRef.current = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= ANIMATION_TARGET_PROGRESS) {
        setProgress(ANIMATION_TARGET_PROGRESS);
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current);
          animationIntervalRef.current = null;
        }
      } else {
        setProgress(currentProgress);
      }
    }, updateInterval);

    // 4. The cleanup function will handle finishing the animation for THIS navigation.
    // This runs when the component unmounts OR before this effect runs again
    // for a new navigation (i.e., when navigating away from the current page).
    return () => {
      clearAllTimers(); // Clear the animation interval first

      // Animate to 100% and then hide
      // Check isVisible because this cleanup might run even if the bar wasn't made visible
      // (e.g. initial load if we decided not to show it then)
      // However, with the current logic, it *will* be visible.
      setProgress(100); 
      finishTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setProgress(0); // Reset for the next navigation
      }, FINISH_ANIMATION_DURATION_MS);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]); // Key dependencies: re-run on any navigation

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[9999]">
      <Progress
        value={progress}
        className="w-full h-full rounded-none bg-transparent" // Background is transparent, indicator uses primary
      />
    </div>
  );
}

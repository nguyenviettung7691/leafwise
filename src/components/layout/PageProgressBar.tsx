
'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Progress } from '@/components/ui/progress'; // Assuming you have a Progress component

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any existing timers/animations when path changes
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Start the progress bar
    setIsVisible(true);
    setProgress(10); // Initial small progress

    let currentProgress = 10;
    const targetProgress = 90;
    const duration = 2000; // Animate to 90% over 2 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      const progressFraction = elapsedTime / duration;

      if (progressFraction < 1) {
        currentProgress = 10 + (targetProgress - 10) * progressFraction;
        setProgress(currentProgress);
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(targetProgress); // Hold at target progress
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup function for when the component unmounts or dependencies change (effectively meaning navigation ended or new one started)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Quickly complete and hide
      setProgress(100);
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 300); // Short delay to show 100% then hide
    };
  }, [pathname, searchParams]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 w-full z-50 h-1">
      <Progress value={progress} className="h-1 rounded-none [&>div]:bg-primary" />
    </div>
  );
}

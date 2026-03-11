
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMotionValue, animate } from 'framer-motion';

type ProgressState = 'initial' | 'in-progress' | 'completing' | 'complete';

const IN_PROGRESS_TARGET = 0.9; // Animate to 90% during in-progress state
const IN_PROGRESS_DURATION = 10; // Time in seconds to reach 90%
const COMPLETING_DURATION = 0.3; // Time in seconds to reach 100% when done
const RESET_DELAY = 0.5; // Time in seconds to delay reset after completion animation

export function useProgress() {
  const [state, setState] = useState<ProgressState>('initial');
  const stateRef = useRef<ProgressState>('initial');
  const value = useMotionValue(0);
  const animationControlsRef = useRef<ReturnType<typeof animate> | null>(null);

  const start = useCallback(() => {
    if (animationControlsRef.current) {
      animationControlsRef.current.stop();
    }
    stateRef.current = 'in-progress';
    setState('in-progress');
    value.set(0.05); // Start with a small initial progress
    const controls = animate(value, IN_PROGRESS_TARGET, {
      duration: IN_PROGRESS_DURATION,
      ease: 'linear',
    });
    animationControlsRef.current = controls;
  }, [value]);

  const done = useCallback(() => {
    if (animationControlsRef.current) {
      animationControlsRef.current.stop();
    }
    if (stateRef.current === 'initial' || stateRef.current === 'in-progress') {
      stateRef.current = 'completing';
      setState('completing');
      value.set(Math.max(value.get(), IN_PROGRESS_TARGET * 0.8)); // Ensure it doesn't jump back too much
      const controls = animate(value, 1, {
        duration: COMPLETING_DURATION,
        ease: 'easeOut',
        onComplete: () => {
          stateRef.current = 'complete';
          setState('complete');
        },
      });
      animationControlsRef.current = controls;
    }
  }, [value]);

  const reset = useCallback(() => {
    if (animationControlsRef.current) {
      animationControlsRef.current.stop();
    }
    stateRef.current = 'initial';
    setState('initial');
    value.set(0);
    animationControlsRef.current = null;
  }, [value]);

  // Effect to handle delayed reset after completion
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (state === 'complete') {
      timeoutId = setTimeout(() => {
        // Check if state is still 'complete' before resetting,
        // in case a new navigation started very quickly.
        if (stateRef.current === 'complete') {
          reset();
        }
      }, RESET_DELAY * 1000);
    }
    return () => clearTimeout(timeoutId);
  }, [state, reset]);

  return { start, done, reset, state, value };
}

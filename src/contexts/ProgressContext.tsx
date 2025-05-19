
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { MotionValue } from 'framer-motion';
import { useProgress } from '@/hooks/use-progress';

type ProgressContextType = {
  start: () => void;
  done: () => void;
  reset: () => void;
  state: 'initial' | 'in-progress' | 'completing' | 'complete';
  value: MotionValue<number>;
};

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const progressControls = useProgress();
  return (
    <ProgressContext.Provider value={progressControls}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgressContext() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgressContext must be used within a ProgressProvider');
  }
  return context;
}

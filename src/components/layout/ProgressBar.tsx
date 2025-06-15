
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useProgressContext } from '@/contexts/ProgressContext';

export function ProgressBar() {
  const { state, value, reset } = useProgressContext();

  // This effect handles the reset after the fade-out animation completes.
  // AnimatePresence handles the exit animation, but we need to call reset
  // once the "complete" state is reached and the bar is visually gone.
  // The useProgress hook itself has a delayed reset, this component focuses on visual transitions.

  return (
    <AnimatePresence onExitComplete={state === 'complete' ? reset : undefined}>
      {(state === 'in-progress' || state === 'completing' || state === 'complete') && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-1 bg-primary z-50"
          style={{
            scaleX: value,
            transformOrigin: 'left',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.3, delay: state === 'complete' ? 0.2 : 0 } // Delay fade-out only on complete
          }} 
        />
      )}
    </AnimatePresence>
  );
}

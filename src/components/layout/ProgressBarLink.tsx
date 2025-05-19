
'use client';

import type { LinkProps } from 'next/link';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import React, { startTransition, type MouseEvent, type ReactNode } from 'react';
import { useProgressContext } from '@/contexts/ProgressContext';

interface ProgressBarLinkProps extends Omit<LinkProps, 'onClick'> {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void; // Allow custom onClick
}

export function ProgressBarLink({
  href,
  children,
  className,
  onClick: customOnClick,
  ...rest
}: ProgressBarLinkProps) {
  const router = useRouter();
  const { start, done } = useProgressContext();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (customOnClick) {
      customOnClick(event);
      if (event.defaultPrevented) return;
    }

    // Check if it's a normal left-click, not a command/ctrl click or middle click
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      const targetHref = href.toString();
      // Don't run for external links or mailto/tel links
      if (targetHref.startsWith('/') || targetHref.startsWith('#') || targetHref.startsWith(window.location.origin)) {
        event.preventDefault();
        start();
        startTransition(() => {
          router.push(targetHref);
          // done() will be called after router.push() is processed and new UI is rendered
          // The actual visual completion of the bar is handled by the ProgressBar component
          // and the useProgress hook's state transitions.
          // Calling done() here signals the *intent* to complete.
          done();
        });
      } else {
        // For external links, let the browser handle it normally
        // but still start and complete the progress bar quickly if desired.
        // Or simply do nothing for external links to avoid showing progress.
        // For now, we'll assume progress bar is for internal navigations only.
      }
    }
  };

  return (
    <NextLink href={href} onClick={handleClick} className={className} {...rest}>
      {children}
    </NextLink>
  );
}

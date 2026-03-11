
'use client';

import type { LinkProps } from 'next/link';
import NextLink from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const { start, done } = useProgressContext();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (customOnClick) {
      customOnClick(event);
    }

    // Skip if the event was already handled by a child or custom onClick
    if (event.defaultPrevented) return;

    // Check if it's a normal left-click, not a command/ctrl click or middle click
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      const targetHref = href.toString();

      // Skip hash-only links (e.g. "#", "#section") — they don't navigate to a new page
      if (targetHref.startsWith('#')) return;

      // Only handle internal navigation links
      if (targetHref.startsWith('/') || targetHref.startsWith(window.location.origin)) {
        // Extract the pathname portion (without query string or hash)
        const targetPath = targetHref.startsWith(window.location.origin)
          ? targetHref.slice(window.location.origin.length).split(/[?#]/)[0]
          : targetHref.split(/[?#]/)[0];

        // Normalize trailing slashes for comparison
        const normalize = (p: string) => p.replace(/\/+$/, '') || '/';

        // Skip if navigating to the current page
        if (normalize(targetPath) === normalize(pathname)) return;

        event.preventDefault();
        start();
        startTransition(() => {
          router.push(targetHref);
          done();
        });
      }
    }
  };

  return (
    <NextLink href={href} onClick={handleClick} className={className} {...rest}>
      {children}
    </NextLink>
  );
}

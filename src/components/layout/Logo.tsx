import type { SVGProps } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  textColorClassName?: string;
  iconColorClassName?: string;
}

function LeafWiseLogoIcon({ size = 24, color = "currentColor", ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M100 20C55.8172 20 20 55.8172 20 100C20 144.183 55.8172 180 100 180C144.183 180 180 144.183 180 100C180 55.8172 144.183 20 100 20Z"
        fill="hsl(var(--primary) / 0.1)" // Light primary fill for the circle
      />
      <path
        d="M100 25C85.8331 49.3331 73.4999 60.1665 71.6665 62.4999C60.8332 77.4999 64.1665 94.9999 71.6665 105.833C77.4999 114.167 80.8332 124.167 71.6665 137.5C76.6969 134.038 80.7096 129.729 83.9165 124.167C87.4999 116.667 91.6665 110.833 100 97.4999C108.333 110.833 112.5 116.667 116.083 124.167C119.29 129.729 123.303 134.038 128.333 137.5C119.167 124.167 122.5 114.167 128.333 105.833C135.833 94.9999 139.167 77.4999 128.333 62.4999C126.5 60.1665 114.167 49.3331 100 25Z"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M100 97.4999V175"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  iconSize = 24,
  textSize = "text-2xl",
  textColorClassName = "text-foreground",
  iconColorClassName = "text-primary",
}: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      <LeafWiseLogoIcon size={iconSize} className={cn("group-hover:opacity-80 transition-opacity", iconColorClassName)} />
      <span className={cn("font-bold group-hover:opacity-80 transition-opacity", textSize, textColorClassName)}>
        LeafWise
      </span>
    </Link>
  );
}

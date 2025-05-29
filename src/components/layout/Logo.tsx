import Image from 'next/image'
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconSize?: number;
  iconColorClassName?: string;
}

function LeafWiseLogoIcon({ size = 24, className = "" } : { size?: number, className?: string }) {
  return (
    <Image
      src="/logo_transparent.png"
      alt="Logo of the web app"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}

export function Logo({
  className,
  iconSize = 24,
  iconColorClassName = "text-primary",
}: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      <LeafWiseLogoIcon size={iconSize} className={cn("group-hover:opacity-80 transition-opacity", iconColorClassName)} />
    </Link>
  );
}

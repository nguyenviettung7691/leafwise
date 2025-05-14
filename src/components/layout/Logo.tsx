import { Leaf } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 24, textSize = "text-2xl" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Leaf className="text-primary" size={iconSize} />
      <span className={`font-bold ${textSize} text-foreground`}>LeafWise</span>
    </Link>
  );
}

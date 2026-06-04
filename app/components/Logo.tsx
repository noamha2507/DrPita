'use client';

import Image from 'next/image';

export default function Logo({ size = 40 }: { size?: number; light?: boolean }) {
  return (
    <Image
      src="/logo-nobg.png"
      alt="ד״ר פיתה"
      width={size}
      height={size}
      className="object-contain"
      priority
    />
  );
}

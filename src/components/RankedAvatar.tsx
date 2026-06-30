import Image from "next/image";
import { getRingClass } from "@/lib/ranks";

interface RankedAvatarProps {
  rankPoints: number;
  src: string | null | undefined;
  alt: string;
  /**
   * Inner image pixel size — used for the Next.js Image width/height.
   * If you control outer size via `className` (e.g. Tailwind w-16 h-16),
   * set this to the same value in px.
   */
  size?: number;
  rounded?: "full" | "2xl" | "xl" | "lg";
  className?: string;
}

const ROUNDED = {
  full: "rounded-full",
  "2xl": "rounded-2xl",
  xl:   "rounded-xl",
  lg:   "rounded-lg",
};

/** Ring padding in px per tier suffix (i/ii/iii) */
const TIER_PAD_PX: Record<string, number> = { i: 3, ii: 4, iii: 5 };

function getTierPad(ringClass: string): number {
  const suffix = ringClass.split("-").at(-1) ?? "i";
  return TIER_PAD_PX[suffix] ?? 2;
}

export default function RankedAvatar({
  rankPoints,
  src,
  alt,
  size = 40,
  rounded = "full",
  className = "",
}: RankedAvatarProps) {
  const ringClass = getRingClass(rankPoints);
  const pad       = getTierPad(ringClass);
  const r         = ROUNDED[rounded];

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=3f3f46&color=e4e4e7&size=${size * 2}`;
  const imgSrc   = src ?? fallback;

  return (
    <div
      className={`${ringClass} ${r} shrink-0 ${className}`}
      style={{ padding: pad }}
    >
      <div className={`${r} overflow-hidden bg-[#0d0d0f] w-full h-full`}>
        <Image
          src={imgSrc}
          alt={alt}
          width={size}
          height={size}
          className={`${r} object-cover w-full h-full`}
          unoptimized
        />
      </div>
    </div>
  );
}

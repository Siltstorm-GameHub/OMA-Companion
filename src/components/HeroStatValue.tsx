"use client";
import { CountUp } from "@/components/CountUp";
import { useValueDelta, ValueDeltaBadge } from "@/components/StatDelta";

export function HeroStatValue({
  value,
  storageKey,
  children,
}: {
  value: number;
  storageKey: string;
  children?: React.ReactNode;
}) {
  const delta = useValueDelta(storageKey, value);
  return (
    <span className="relative inline-flex items-center gap-1">
      <ValueDeltaBadge delta={delta} />
      <CountUp to={value} duration={900} />
      {children}
    </span>
  );
}

"use client";
import { useEffect, useState } from "react";

export function AnimatedBar({ pct, className }: { pct: number; className?: string }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div
      className={className}
      style={{ width: `${width}%`, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }}
    />
  );
}

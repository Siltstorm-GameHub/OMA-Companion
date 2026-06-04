"use client";
import { useState, useEffect } from "react";

function formatRelative(date: Date): string {
  const now   = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absSec = Math.abs(diffMs) / 1000;
  const future = diffMs > 0;

  if (absSec < 60)                          return "gerade eben";
  if (absSec < 3600)  { const m = Math.round(absSec / 60);   return future ? `in ${m} Min.`     : `vor ${m} Min.`;  }
  if (absSec < 86400) { const h = Math.round(absSec / 3600); return future ? `in ${h} Std.`     : `vor ${h} Std.`;  }
  if (absSec < 172800)                       return future ? "morgen"        : "gestern";
  if (absSec < 604800) { const d = Math.round(absSec / 86400);  return future ? `in ${d} Tagen`  : `vor ${d} Tagen`; }
  if (absSec < 2592000){ const w = Math.round(absSec / 604800); return future ? `in ${w} Wo.`    : `vor ${w} Wo.`;   }

  // Absolute date for older/farther entries
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

interface RelativeTimeProps {
  date: Date | string;
  /** Show the absolute date as a tooltip on hover */
  showTooltip?: boolean;
  className?: string;
}

export function RelativeTime({ date, showTooltip = true, className }: RelativeTimeProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  const [label, setLabel] = useState(() => formatRelative(d));

  useEffect(() => {
    setLabel(formatRelative(d));
    // Refresh every minute
    const id = setInterval(() => setLabel(formatRelative(d)), 60_000);
    return () => clearInterval(id);
  }, [d]);

  const absolute = d.toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <time
      dateTime={d.toISOString()}
      title={showTooltip ? absolute : undefined}
      className={className}
    >
      {label}
    </time>
  );
}

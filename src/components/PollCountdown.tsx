"use client";
import { useEffect, useState } from "react";

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Jetzt";
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  const s = Math.floor((diffMs % 60_000) / 1_000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function usePollCountdown(targetDate: string | Date): string {
  const target = typeof targetDate === "string" ? targetDate : targetDate.toISOString();
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(new Date(target).getTime() - Date.now()));
  useEffect(() => {
    function update() { setTimeLeft(formatCountdown(new Date(target).getTime() - Date.now())); }
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [target]);
  return timeLeft;
}

/** Live-ticking countdown ("2h 15m", "45s", …) bis zu einem Zielzeitpunkt — für Umfragen o.ä. */
export default function PollCountdown({ targetDate }: { targetDate: string | Date }) {
  const timeLeft = usePollCountdown(targetDate);
  return <>{timeLeft}</>;
}

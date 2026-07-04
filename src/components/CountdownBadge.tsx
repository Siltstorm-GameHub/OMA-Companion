"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function useCountdown(targetDate: string | Date) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    function update() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("beendet"); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(d > 0 ? `${d}T ${h}Std` : h > 0 ? `${h}Std ${m}Min` : m > 0 ? `${m}Min ${s}Sek` : `${s}Sek`);
    }
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

export default function CountdownBadge({ endsAt, label = "Endet in" }: { endsAt: string | Date; label?: string }) {
  const t = useCountdown(endsAt);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
      <Clock className="w-3 h-3" /> {label} {t}
    </span>
  );
}

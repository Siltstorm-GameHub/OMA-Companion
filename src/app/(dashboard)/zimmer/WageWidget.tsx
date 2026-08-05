"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Loader2, Briefcase, TriangleAlert } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { useNow } from "@/lib/useNow";
import { computeAccrual, formatDuration, getJob, MIN_CLAIM_MINUTES } from "@/lib/jobs";
import type { CurrentJob } from "@/lib/job-service";
import { cn } from "@/lib/utils";

interface Props {
  current:      CurrentJob | null;
  wageCapHours: number;
  multiplierPct: number;
  onOpenBoard:  () => void;
  onClaimed:    () => void;
}

/**
 * Lohn-Anzeige unter der Bühne.
 *
 * Der Ticker ruft dieselbe reine computeAccrual() auf, die auch der Server beim
 * Abholen benutzt. Dadurch ist die angezeigte Zahl exakt der Auszahlbetrag —
 * und weil der Server ein paar Millisekunden später rechnet, bekommt niemand
 * jemals weniger, als hier stand.
 */
export default function WageWidget({
  current, wageCapHours, multiplierPct, onOpenBoard, onClaimed,
}: Props) {
  const router = useRouter();
  const now = useNow(1000);
  const [claiming, setClaiming] = useState(false);
  // Direkt nach dem Abholen soll der Zähler sofort auf 0 springen, ohne auf
  // router.refresh() zu warten. Sobald der Server denselben oder einen neueren
  // Zeitpunkt liefert, gewinnt dieser von selbst — kein Aufräumen nötig.
  const [claimedAt, setClaimedAt] = useState(0);

  const job = getJob(current?.jobKey);

  if (!current || !job || !current.accrualFrom) {
    return (
      <button
        type="button"
        onClick={onOpenBoard}
        className="w-full glass card-shine rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
          <Briefcase className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Du bist arbeitslos</p>
          <p className="text-[11px] text-gray-500">
            Am schwarzen Brett hängen Stellen — Münzen verdienen sich nebenbei.
          </p>
        </div>
        <span className="text-[11px] text-teal-400 shrink-0">Jobbörse →</span>
      </button>
    );
  }

  const accrualFrom = Math.max(new Date(current.accrualFrom).getTime(), claimedAt);
  const accrual = computeAccrual(job, accrualFrom, now, { wageCapHours, multiplierPct });

  const capMinutes  = wageCapHours * 60;
  const pct         = Math.min(100, Math.round((accrual.countedMinutes / capMinutes) * 100));
  const nearlyFull  = !accrual.capped && pct >= 83;   // ab ~20 von 24 Stunden
  const canClaim    = accrual.countedMinutes >= MIN_CLAIM_MINUTES;

  async function claim() {
    setClaiming(true);
    try {
      const res  = await fetch("/api/jobs/claim", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Abholen fehlgeschlagen"); return; }

      setClaimedAt(Date.now());
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
      toast.success(`+${body.coins} Münzen für ${formatDuration(body.countedMinutes)} Arbeit`);
      if (body.fired) toast.error(body.fired, { duration: 8000 });

      router.refresh();
      onClaimed();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className={cn(
      "glass card-shine rounded-2xl px-4 py-3.5 space-y-3 border",
      accrual.capped ? "border-rose-500/25" : nearlyFull ? "border-amber-500/25" : "border-transparent"
    )}>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button" onClick={onOpenBoard}
          className="flex items-center gap-2 min-w-0 flex-1 text-left group"
        >
          <span className="text-xl shrink-0">{job.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate group-hover:text-teal-300 transition-colors">
              {job.label}
            </p>
            <p className="text-[11px] text-gray-500 tabular-nums">
              {job.coinsPerHour} Münzen/Stunde · seit {formatDuration(accrual.workedMinutes)}
            </p>
          </div>
        </button>

        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-amber-400 tabular-nums flex items-center gap-1 justify-end leading-none">
            {accrual.coins.toLocaleString("de-DE")}<CoinIcon size={16} />
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {accrual.capped
              ? "Lohnfach voll"
              : accrual.nextCoinInSec > 0
                ? `nächste in ${accrual.nextCoinInSec}s`
                : "läuft auf"}
          </p>
        </div>

        <button
          type="button"
          onClick={claim}
          disabled={claiming || !canClaim}
          title={!canClaim ? `Erst ab ${MIN_CLAIM_MINUTES} Minuten Arbeit` : undefined}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors",
            canClaim
              ? "bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30"
              : "bg-white/[0.04] border border-white/[0.06] text-gray-600 cursor-not-allowed"
          )}
        >
          {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CoinIcon size={14} />}
          {claiming ? "Holt ab…" : "Lohn abholen"}
        </button>
      </div>

      {/* Füllstand des Lohnfachs — macht sichtbar, wann Lohn zu verfallen droht */}
      <div>
        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
              accrual.capped ? "from-rose-600 to-rose-400"
              : nearlyFull   ? "from-amber-600 to-amber-400"
              :                "from-teal-600 to-teal-400"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {(accrual.capped || nearlyFull) && (
          <p className={cn(
            "text-[10px] mt-1.5 flex items-center gap-1",
            accrual.capped ? "text-rose-400" : "text-amber-400"
          )}>
            <TriangleAlert className="w-2.5 h-2.5 shrink-0" />
            {accrual.capped
              ? `Lohnfach ist voll — ab jetzt verfällt jede weitere Stunde.`
              : `Lohnfach fast voll (${wageCapHours}h). Bald abholen, sonst verfällt der Rest.`}
          </p>
        )}
      </div>
    </div>
  );
}

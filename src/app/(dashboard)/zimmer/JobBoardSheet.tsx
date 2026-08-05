"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Loader2, Lock, Check, Briefcase, TriangleAlert } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { Modal } from "@/components/ui";
import { RANKS } from "@/lib/ranks";
import { useNow } from "@/lib/useNow";
import { formatDuration } from "@/lib/jobs";
import type { JobOverview, JobListEntry } from "@/lib/job-service";
import { cn } from "@/lib/utils";

interface Props {
  open:      boolean;
  onClose:   () => void;
  /** Fremdes Zimmer: nur zuschauen. */
  readOnly:  boolean;
  onChanged: () => void;
}

function tierLabel(tier: number): string {
  return RANKS.find(r => r.tier === tier)?.label ?? `Stufe ${tier}`;
}

const ACCENT: Record<JobListEntry["accent"], string> = {
  slate:  "border-white/[0.08]",
  teal:   "border-teal-500/25",
  violet: "border-violet-500/25",
  amber:  "border-amber-500/25",
  rose:   "border-rose-500/25",
};

/**
 * Die Jobbörse am schwarzen Brett. Lädt erst beim Öffnen — die Zimmerseite
 * soll nicht für jeden Besucher die Job-Daten mitschleppen.
 */
export default function JobBoardSheet({ open, onClose, readOnly, onChanged }: Props) {
  const router = useRouter();
  const now = useNow(30_000);
  const [data,   setData]   = useState<JobOverview | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await fetch("/api/jobs").then(r => r.json());
        if (cancelled) return;
        setData(d.error ? null : d);
      } catch {
        if (!cancelled) toast.error("Jobbörse nicht erreichbar");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  async function reload() {
    const d = await fetch("/api/jobs").then(r => r.json()).catch(() => null);
    if (d && !d.error) setData(d);
    router.refresh();
    onChanged();
  }

  async function hire(job: JobListEntry) {
    setActing(job.key);
    try {
      const res  = await fetch("/api/jobs/hire", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobKey: job.key }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Bewerbung fehlgeschlagen"); return; }

      confetti({ particleCount: 70, spread: 65, origin: { y: 0.7 } });
      toast.success(
        body.autoClaimed > 0
          ? `${job.emoji} Eingestellt als ${job.label} — ${body.autoClaimed} Münzen vom alten Job abgerechnet`
          : `${job.emoji} Eingestellt als ${job.label}!`
      );
      await reload();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setActing(null);
    }
  }

  async function quit() {
    if (!confirm("Wirklich kündigen? Der aufgelaufene Lohn wird ausgezahlt.")) return;
    setActing("__quit");
    try {
      const res  = await fetch("/api/jobs/quit", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Kündigung fehlgeschlagen"); return; }
      toast.success(
        body.paidOut > 0 ? `Gekündigt — ${body.paidOut} Münzen ausgezahlt` : "Gekündigt"
      );
      await reload();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setActing(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="📋 Jobbörse">
      {!loaded && !data ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-600" /></div>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-gray-500">Jobbörse gerade nicht verfügbar.</p>
      ) : !data.enabled ? (
        <p className="py-10 text-center text-sm text-gray-500">Die Idle-Jobs sind gerade deaktiviert.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Ein Job auf einmal. Der Lohn läuft stündlich auf und wartet bis zu{" "}
            {data.wageCapHours} Stunden auf dich — danach verfällt er.
            Bessere Stellen verlangen einen höheren Rang <em>und</em> das passende Setup im Zimmer.
          </p>

          {data.current && (
            <div className="rounded-2xl border border-teal-500/25 bg-teal-500/[0.06] p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl">{data.current.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{data.current.label}</p>
                  <p className="text-[11px] text-gray-400">
                    Angestellt seit{" "}
                    {data.current.hiredAt
                      ? new Date(data.current.hiredAt).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "short", timeZone: "Europe/Berlin",
                        })
                      : "—"}
                    {" · "}{data.current.coinsPerHour} Münzen/Stunde
                  </p>
                </div>
                {!readOnly && (
                  <button
                    type="button" onClick={quit} disabled={acting !== null}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/25 transition-colors disabled:opacity-50"
                  >
                    {acting === "__quit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Kündigen"}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {data.jobs.map(job => (
              <JobRow
                key={job.key} job={job} readOnly={readOnly} now={now}
                busy={acting === job.key} anyBusy={acting !== null}
                lockedUntil={job.isCurrent ? null : data.current?.hireLockedUntil ?? null}
                onHire={() => hire(job)}
              />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function JobRow({
  job, readOnly, busy, anyBusy, lockedUntil, now, onHire,
}: {
  job: JobListEntry; readOnly: boolean; busy: boolean; anyBusy: boolean;
  lockedUntil: string | null; now: number; onHire: () => void;
}) {
  // `now` kommt aus useNow() statt Date.now() im Render — sonst wäre das
  // Ergebnis vom Render-Zeitpunkt abhängig und damit unrein.
  const lockUntilMs = lockedUntil ? new Date(lockedUntil).getTime() : 0;
  const lockActive  = lockUntilMs > now;
  const lockRest    = lockActive ? formatDuration(Math.ceil((lockUntilMs - now) / 60_000)) : null;

  return (
    <div className={cn(
      "rounded-xl border p-3 bg-white/[0.02] transition-opacity",
      ACCENT[job.accent],
      !job.unlocked && !job.isCurrent && "opacity-70"
    )}>
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 leading-none mt-0.5">{job.emoji}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{job.label}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-0.5 tabular-nums">
              {job.coinsPerHour}<CoinIcon size={9} />/h
            </span>
            {job.isCurrent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/25 text-teal-300 font-semibold">
                Aktuell
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{job.flavor}</p>

          {/* Voraussetzungen — erfüllt grün, fehlend grau mit Ist/Soll */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border",
              job.rankOk
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-white/[0.04] border-white/[0.08] text-gray-500"
            )}>
              {job.rankOk ? "✓" : "🔒"} {tierLabel(job.minTier)}
            </span>
            {job.requirements.map(req => {
              const ok = req.have >= req.need;
              return (
                <span key={req.tag} className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border",
                  ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                     : "bg-white/[0.04] border-white/[0.08] text-gray-500"
                )}>
                  {ok ? "✓" : "○"} {req.need > 1 ? `${req.have}/${req.need} ` : ""}{req.label}
                </span>
              );
            })}
          </div>

          {!job.setupOk && job.rankOk && (
            <Link href="/shop#moebel"
              className="inline-flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 mt-2 transition-colors">
              <Briefcase className="w-2.5 h-2.5" /> Fehlende Möbel im Shop ansehen →
            </Link>
          )}
        </div>

        {!readOnly && !job.isCurrent && (
          <button
            type="button"
            onClick={onHire}
            disabled={!job.unlocked || anyBusy || lockActive}
            title={
              lockActive ? `Wechsel möglich in ${lockRest}`
              : !job.rankOk ? `Ab Rang ${tierLabel(job.minTier)}`
              : !job.setupOk ? "Setup unvollständig"
              : undefined
            }
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors self-center",
              job.unlocked && !lockActive
                ? "bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25"
                : "bg-white/[0.04] border border-white/[0.06] text-gray-600 cursor-not-allowed"
            )}
          >
            {busy         ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
           : lockActive   ? <span className="flex items-center gap-1"><TriangleAlert className="w-3 h-3" />{lockRest}</span>
           : !job.unlocked? <Lock className="w-3.5 h-3.5" />
           :                "Bewerben"}
          </button>
        )}

        {job.isCurrent && (
          <Check className="w-4 h-4 text-teal-400 shrink-0 self-center" />
        )}
      </div>
    </div>
  );
}

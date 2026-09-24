"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Info, Loader2 } from "@/components/icons";

interface Health {
  key: string; label: string; emoji: string; maxSlots: number; filled: number; free: number;
  pending: number; waitlisted: number; active7: number; idle14: number; warned: number; endingSoon: number;
  lastWeekCoins: number; lastWeekPaid: number; hints: { level: "warn" | "info"; text: string }[];
}

const LABEL = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest";

/** Gesundheit je Job: Besetzung, Aktivität, Bewerber, Verträge — mit Hinweisen, wo etwas hakt. */
export default function JobHealthBlock() {
  const [jobs, setJobs] = useState<Health[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/community-jobs/overview?part=health").then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: { jobs: Health[] }) => setJobs(d.jobs)).catch(() => setJobs([]));
  }, []);

  if (!jobs) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div>;
  const warnCount = jobs.reduce((n, j) => n + j.hints.filter(h => h.level === "warn").length, 0);

  return (
    <section className="space-y-2">
      <h2 className={LABEL}>Überblick{warnCount > 0 ? ` — ${warnCount} ${warnCount === 1 ? "Hinweis" : "Hinweise"}` : " — alles im grünen Bereich"}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {jobs.map(j => (
          <div key={j.key} className="glass rounded-xl p-3 space-y-2">
            <p className="text-xs text-white font-semibold">{j.emoji} {j.label}</p>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-white/[0.03] py-1.5"><p className="text-sm text-white font-semibold tabular-nums">{j.filled}/{j.maxSlots}</p><p className="text-[10px] text-gray-500">Plätze</p></div>
              <div className="rounded-lg bg-white/[0.03] py-1.5"><p className="text-sm text-white font-semibold tabular-nums">{j.active7}/{j.filled}</p><p className="text-[10px] text-gray-500">aktiv (7 T.)</p></div>
              <div className="rounded-lg bg-white/[0.03] py-1.5"><p className="text-sm text-white font-semibold tabular-nums">{j.pending + j.waitlisted}</p><p className="text-[10px] text-gray-500">Bewerber</p></div>
            </div>
            <p className="text-[10px] text-gray-500">Letzte Woche: {j.lastWeekPaid} ausgezahlt, {j.lastWeekCoins} Münzen</p>
            {j.hints.length > 0 && (
              <ul className="space-y-1">
                {j.hints.map((h, i) => (
                  <li key={i} className={`flex items-start gap-1.5 text-[11px] ${h.level === "warn" ? "text-amber-400" : "text-gray-400"}`}>
                    {h.level === "warn" ? <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> : <Info className="w-3 h-3 mt-0.5 shrink-0" />}{h.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

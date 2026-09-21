"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Scale } from "lucide-react";
import { formatBerlinDate } from "@/lib/time";

/** "Wie setzt sich dein Score zusammen?" — Stimmen je Quelle, Deckel, Boni, Stufe (laufende + letzte Wochen). */

interface StreamResult { key: string; label: string; unit: "thumb" | "stars"; count: number; rawPoints: number; countedPoints: number }
interface Breakdown {
  weekStart: string; streams: StreamResult[]; rawBase: number; trimmedByVoter: number; trimmedByItems: number; base: number;
  bonuses: { key: string; label: string; points: number }[]; total: number; caps: { maxVotesPerVoter: number; maxItems: number };
}
interface Week {
  isCurrent: boolean; breakdown: Breakdown; tierLabel: string | null;
  next: { label: string; missing: number } | null; paid: { coins: number; tierLabel: string | null } | null;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));
const TAB_ON = "border-teal-500/50 text-teal-300 bg-teal-500/10";
const TAB_OFF = "border-white/10 text-gray-400 hover:text-white";

export default function ScoreBreakdownBlock() {
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/community-jobs/score-breakdown").then(r => (r.ok ? r.json() : null))
      .then((d: { weeks: Week[] } | null) => setWeeks(d?.weeks ?? [])).catch(() => setWeeks([]));
  }, []);

  if (!weeks || weeks.length === 0) return null;
  const week = weeks[selected] ?? weeks[0];
  const b = week.breakdown;
  const trimmed = b.trimmedByVoter + b.trimmedByItems;

  return (
    <div className="p-4 border-b border-white/[0.04] space-y-2.5">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-300 uppercase tracking-widest">
          <Scale className="w-3.5 h-3.5 text-teal-400" /> Wie setzt sich dein Score zusammen?
        </span>
        <span className="flex items-center gap-2 text-[11px] text-gray-500">
          {weeks[0].breakdown.total > 0 ? `${fmt(weeks[0].breakdown.total)} Punkte diese Woche` : "diese Woche noch 0 Punkte"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Woche">
            {weeks.map((w, i) => (
              <button key={w.breakdown.weekStart} role="tab" aria-selected={selected === i} onClick={() => setSelected(i)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${selected === i ? TAB_ON : TAB_OFF}`}>
                {w.isCurrent ? "Diese Woche" : `Woche ab ${formatBerlinDate(w.breakdown.weekStart, { day: "2-digit", month: "2-digit" })}`}
              </button>
            ))}
          </div>

          <ul className="space-y-1">
            {b.streams.map(s => (
              <li key={s.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-gray-300">
                  {s.label} <span className="text-gray-600">· {s.count} {s.unit === "stars" ? (s.count === 1 ? "Bewertung" : "Bewertungen") : "Daumen"}</span>
                </span>
                <span className="tabular-nums text-gray-200">{signed(s.countedPoints)}</span>
              </li>
            ))}
            {b.bonuses.map(x => (
              <li key={x.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-gray-300">{x.label}</span>
                <span className="tabular-nums text-emerald-400">{signed(x.points)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 text-xs border-t border-white/[0.06] pt-1.5">
              <span className="text-white font-semibold">Summe</span>
              <span className="tabular-nums text-white font-semibold">{fmt(b.total)} Punkte{week.tierLabel ? ` → ${week.tierLabel}` : ""}</span>
            </li>
          </ul>

          {trimmed !== 0 && (
            <p className="text-[11px] text-amber-400/90">
              {fmt(Math.abs(trimmed))} {Math.abs(trimmed) === 1 ? "Punkt zählt" : "Punkte zählen"} nicht:{" "}
              {b.trimmedByVoter !== 0 && `von derselben Person zählen pro Woche höchstens ${b.caps.maxVotesPerVoter} Stimmen`}
              {b.trimmedByVoter !== 0 && b.trimmedByItems !== 0 && ", "}
              {b.trimmedByItems !== 0 && `pro Woche zählen deine besten ${b.caps.maxItems} Beiträge`}.
            </p>
          )}
          {week.next
            ? <p className="text-[11px] text-gray-500">Noch {fmt(week.next.missing)} {week.next.missing === 1 ? "Punkt" : "Punkte"} bis „{week.next.label}“.</p>
            : week.tierLabel && <p className="text-[11px] text-emerald-400">Höchste Stufe erreicht.</p>}
          {week.paid && <p className="text-[11px] text-gray-500">Ausgezahlt: {week.paid.coins} Münzen{week.paid.tierLabel ? ` (${week.paid.tierLabel})` : ""}.</p>}

          <p className="text-[10px] text-gray-600 leading-relaxed">
            Daumen zählen 1 Punkt. Sterne werden umgerechnet: 4–5 Sterne = +1, 3 = 0, 1–2 = −1. Der Wert wird nie kleiner als 0.
            {!week.isCurrent && " Frühere Wochen sind mit dem heutigen Stand neu gerechnet."}
          </p>
        </div>
      )}
    </div>
  );
}

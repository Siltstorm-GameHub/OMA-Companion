"use client";
// Bausteine der Turnier-Seite (Verwaltung): Kopf mit Fortschritt und Werkzeug-Menü, gemeldete
// Ergebnisse direkt übernehmen, Live-Tabelle der Stat-Formate und das ⋯-Menü je Match.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, X } from "@/components/icons";
import { formatDecimal, formatFixed } from "@/lib/format-number";
import type { StandingRow } from "@/lib/tournaments/progress";

/** Kleines Aufklapp-Menü (⋯ je Match, "Werkzeuge" im Kopf) — schließt bei Klick daneben und Escape */
export function DropMenu({ trigger, label, items, align = "right" }: {
  trigger: ReactNode; label: string; align?: "left" | "right";
  items: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean; icon?: ReactNode }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen(o => !o)} aria-label={label} aria-expanded={open}
        className="flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-line">
        {trigger}
      </button>
      {open && (
        <div role="menu" className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full z-30 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-line-strong bg-gray-900 shadow-xl`}>
          {visible.map(it => (
            <button key={it.label} role="menuitem" type="button" disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick(); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-line disabled:opacity-40 ${it.danger ? "text-red-300" : "text-gray-200"}`}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Kopf: Format, Stand in Klartext, Fortschritt, Ergebnis-Meldungen und Werkzeuge */
export function TournamentHeader({ formatLabel, statusLine, played, total, unit, resultsHref, pendingCount, tools }: {
  formatLabel: string;
  statusLine: string;
  played: number;
  total: number;
  /** "Matches" oder "Runden" */
  unit: string;
  resultsHref?: string;
  pendingCount: number;
  tools: { label: string; onClick: () => void; disabled?: boolean }[];
}) {
  const pct = total > 0 ? Math.round((played / total) * 100) : 0;
  return (
    <section aria-label="Turnier-Stand" className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="min-w-0 flex-1 text-sm text-gray-300">
          <span className="font-semibold text-white">{formatLabel}</span> · {statusLine}
          {total > 0 && <span className="text-gray-500"> · {played} von {total} {unit} gespielt</span>}
        </p>
        {resultsHref && (
          <Link href={resultsHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-line">
            Ergebnis-Meldungen
            {pendingCount > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-xs font-bold text-black tabular-nums">{pendingCount}</span>}
          </Link>
        )}
        <DropMenu label="Werkzeuge" items={tools}
          trigger={<span className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-semibold text-gray-200">Werkzeuge <ChevronDown className="w-3.5 h-3.5" /></span>} />
      </div>
      {total > 0 && (
        <div className="h-1.5 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
        </div>
      )}
    </section>
  );
}

export type InlineSubmission = {
  id: string;
  matchLabel: string;
  isDuel: boolean;
  by: string;
  /** Stat-Formate: wessen Werte gemeldet wurden */
  forUser: string | null;
  player1: string | null;
  player2: string | null;
  score1: number | null;
  score2: number | null;
  stats: Record<string, number>;
  createdAt: string;
  hasScreenshots: boolean;
};

/** Gemeldete Ergebnisse direkt übernehmen oder ablehnen — Korrigieren und Screenshots auf der Prüf-Seite */
export function InlineSubmissions({ eventId, items, resultsHref }: { eventId: string; items: InlineSubmission[]; resultsHref: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  // Zeitpunkt einmal festhalten (Render bleibt rein; nach Aktionen lädt router.refresh neu)
  const [now] = useState(() => Date.now());
  if (items.length === 0) return null;

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id);
    try {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id, action, reviewNote: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Aktion fehlgeschlagen"); return; }
      toast.success(action === "reject" ? "Meldung abgelehnt" : "Ergebnis übernommen");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const ago = (iso: string) => {
    const min = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60000));
    return min < 60 ? `vor ${min} Min` : min < 1440 ? `vor ${Math.round(min / 60)} Std` : `vor ${Math.round(min / 1440)} Tagen`;
  };

  return (
    <ul className="divide-y divide-line">
      {items.map(s => {
        const what = s.isDuel
          ? <>{s.player1 ?? "?"} <b className="text-white tabular-nums">{s.score1 ?? "–"} : {s.score2 ?? "–"}</b> {s.player2 ?? "?"}</>
          : <>{s.forUser ?? s.by}: {Object.entries(s.stats).filter(([k]) => !k.startsWith("_")).map(([k, v]) => `${formatDecimal(v)} ${k}`).join(" · ") || "keine Werte"}</>;
        return (
          <li key={s.id} className="flex items-center gap-2 py-2 flex-wrap">
            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-300">gemeldet</span>
            <span className="min-w-0 flex-1 text-sm text-gray-300">
              <span className="text-gray-500">{s.matchLabel} · </span>{what}
              {/* Relative Zeit weicht zwischen Server und Browser minimal ab — kein Hydration-Fehler */}
              <span className="block text-xs text-gray-500" suppressHydrationWarning>von {s.by} · {ago(s.createdAt)}{s.hasScreenshots && " · mit Screenshot"}</span>
            </span>
            <button type="button" onClick={() => act(s.id, "approve")} disabled={!!busy}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 hover:bg-teal-500 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
              {busy === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Übernehmen
            </button>
            <button type="button" onClick={() => act(s.id, "reject")} disabled={!!busy}
              className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-line disabled:opacity-50">
              <X className="w-3.5 h-3.5" /> Ablehnen
            </button>
            <Link href={resultsHref} className="text-xs text-gray-500 hover:text-gray-300">Prüfen</Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Live-Tabelle der Stat-Formate (Summen bzw. Ø, optional Eventpunkte) */
export function StatStandingsTable({ rows, fields, isAvg, hasPoints, nameOf, maxRounds }: {
  rows: StandingRow[]; fields: string[]; isAvg: boolean; hasPoints: boolean;
  nameOf: (uid: string) => string; maxRounds: number;
}) {
  if (rows.length === 0) return <p className="py-4 text-center text-sm text-gray-500">Noch keine Werte eingetragen.</p>;
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-line">
            <th className="py-1.5 pr-2 text-left font-medium w-8">#</th>
            <th className="py-1.5 pr-3 text-left font-medium">Spieler</th>
            {fields.map(f => <th key={f} className="py-1.5 px-2 text-right font-medium">{isAvg ? `Ø ${f}` : f}</th>)}
            <th className="py-1.5 px-2 text-right font-medium">Runden</th>
            {isAvg && <th className="py-1.5 pl-2 text-right font-medium">Ø gesamt</th>}
            {hasPoints && <th className="py-1.5 pl-2 text-right font-medium">Eventpunkte</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.userId} className="border-b border-line last:border-0">
              <td className="py-1.5 pr-2">{i < 3 ? medal[i] : <span className="text-gray-500">{i + 1}</span>}</td>
              <td className="py-1.5 pr-3 text-white whitespace-nowrap">{nameOf(r.userId)}</td>
              {fields.map(f => (
                <td key={f} className="py-1.5 px-2 text-right tabular-nums text-gray-300">
                  {r.values[f] == null ? "–" : isAvg ? formatFixed(r.values[f]!, 2) : formatDecimal(r.values[f]!)}
                </td>
              ))}
              <td className={`py-1.5 px-2 text-right tabular-nums ${isAvg && r.rounds < maxRounds ? "text-amber-300" : "text-gray-500"}`}
                title={isAvg && r.rounds < maxRounds ? `Ø aus ${r.rounds} ${r.rounds === 1 ? "Runde" : "Runden"}` : undefined}>
                {r.rounds}{maxRounds > 0 && `/${maxRounds}`}
              </td>
              {isAvg && <td className="py-1.5 pl-2 text-right tabular-nums font-semibold text-white">{r.avg == null ? "–" : formatFixed(r.avg, 2)}</td>}
              {hasPoints && <td className="py-1.5 pl-2 text-right tabular-nums font-semibold text-white">{formatDecimal(r.points ?? 0)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

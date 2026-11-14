"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ConfirmDialog";

type Change = {
  user: string; predicted: string; wager: number;
  before: { resolved: boolean; correct: boolean | null; coins: number };
  after: { correct: boolean; coins: number };
};
type ReportEvent = { eventId: string; title: string; startAt: string; winners: string[]; predictionCount: number; changes: Change[] };

const label = (b: { resolved?: boolean; correct: boolean | null; coins: number }) =>
  `${b.resolved === false ? "offen" : b.correct ? "richtig" : "falsch"} · ${b.coins} Münzen`;

/** Einmalige Nachkorrektur der Sieger-Tipps bei Events mit Gleichstand auf Platz 1 — erst Probelauf,
 *  dann auf Bestätigung ausführen. Benachrichtigt niemanden. */
export default function RecalcTiedPredictionsButton() {
  const [report, setReport] = useState<ReportEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirm();

  async function run(dryRun: boolean) {
    setLoading(true);
    const res = await fetch("/api/admin/predictions/recalculate-ties", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dryRun }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Fehler bei der Neuberechnung"); return; }
    const data = await res.json() as { events: ReportEvent[] };
    setReport(data.events);
    if (!dryRun) { setDone(true); toast.success(`${data.events.length} Event(s) neu berechnet`); }
  }

  const changeCount = report?.reduce((s, e) => s + e.changes.length, 0) ?? 0;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-white">🎯 Sieger-Tipps bei Gleichstand neu berechnen</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Für Events, die vor der Gleichstand-Regel abgeschlossen wurden: Tipps auf jeden der Erstplatzierten
          zählen als richtig, der Pott wird neu verteilt. Ohne Benachrichtigung — die Buchungen erscheinen im Münzverlauf.
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => run(true)} disabled={loading}
          className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">
          {loading ? "…" : "Probelauf"}
        </button>
        {report && report.length > 0 && !done && (
          <button disabled={loading}
            onClick={async () => {
              const ok = await confirm({
                title: "Tipps neu berechnen",
                description: `${report.length} Event(s), ${changeCount} geänderte Tipps. Münzen werden zurückgebucht und neu verteilt.`,
                variant: "danger",
              });
              if (ok) run(false);
            }}
            className="text-xs bg-rose-700 hover:bg-rose-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">
            Jetzt neu berechnen
          </button>
        )}
      </div>
      {report && report.length === 0 && <p className="text-xs text-gray-400">Keine betroffenen Events gefunden.</p>}
      {report && report.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {done && <p className="text-xs text-emerald-400">Neu berechnet:</p>}
          {report.map(e => (
            <div key={e.eventId} className="text-xs">
              <p className="text-gray-200 font-medium">
                {e.title} <span className="text-gray-500 font-normal">· {new Date(e.startAt).toLocaleDateString("de-DE")} · Platz 1: {e.winners.join(", ")} · {e.predictionCount} Tipps</span>
              </p>
              <ul className="mt-1 space-y-0.5 text-gray-400">
                {e.changes.map((c, i) => (
                  <li key={i}>
                    {c.user} → {c.predicted} ({c.wager}): {label(c.before)} ⟶ <span className={c.after.correct ? "text-emerald-400" : "text-gray-300"}>{label(c.after)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {ConfirmDialogElement}
    </div>
  );
}

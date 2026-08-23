"use client";
import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";

interface JobRow {
  key: string; label: string; emoji: string; minTier: number;
  defaultCoinsPerHour: number; defaultMinRoomTier: number;
  coinsPerHour: number; minRoomTier: number;
  overridden: boolean;
}

export function MancaveJobsPanel({ initial }: { initial: JobRow[] }) {
  const [rows, setRows] = useState<JobRow[]>(initial);
  const [drafts, setDrafts] = useState<Record<string, { wage: string; tier: string }>>(
    Object.fromEntries(initial.map(r => [r.key, { wage: String(r.coinsPerHour), tier: String(r.minRoomTier) }])),
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function save(key: string) {
    const draft = drafts[key];
    const coinsPerHour = Number(draft.wage);
    const minRoomTier = Number(draft.tier);
    if (!Number.isFinite(coinsPerHour) || coinsPerHour < 0) { toast.error("Lohn muss ≥ 0 sein"); return; }
    if (!Number.isInteger(minRoomTier) || minRoomTier < 1 || minRoomTier > 4) { toast.error("Mancave-Stufe muss 1-4 sein"); return; }

    setBusy(key);
    try {
      const res = await fetch("/api/admin/mancave-jobs", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobKey: key, coinsPerHour, minRoomTier }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Speichern fehlgeschlagen"); return; }
      setRows(rs => rs.map(r => r.key === key ? { ...r, coinsPerHour, minRoomTier, overridden: true } : r));
      toast.success("Job-Einstellungen gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(null);
    }
  }

  async function reset(key: string, defaults: { coinsPerHour: number; minRoomTier: number }) {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/mancave-jobs", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobKey: key, reset: true }),
      });
      if (!res.ok) { toast.error("Zurücksetzen fehlgeschlagen"); return; }
      setRows(rs => rs.map(r => r.key === key ? { ...r, ...defaults, overridden: false } : r));
      setDrafts(d => ({ ...d, [key]: { wage: String(defaults.coinsPerHour), tier: String(defaults.minRoomTier) } }));
      toast.success("Auf Katalogwerte zurückgesetzt");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 text-left text-[10px] text-gray-500 uppercase tracking-widest">
              <th className="px-4 py-2.5 font-semibold">Job</th>
              <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Rang ab</th>
              <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Münzen/h</th>
              <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Mancave-Stufe ab</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(row => (
              <tr key={row.key}>
                <td className="px-4 py-2 text-gray-200 whitespace-nowrap">
                  {row.emoji} {row.label}
                  {row.overridden && <span className="ml-1.5 text-[9px] text-amber-400">●</span>}
                </td>
                <td className="px-2 py-2 text-gray-500 tabular-nums whitespace-nowrap">Rang {row.minTier}</td>
                <td className="px-2 py-2">
                  <input
                    type="number" min={0} value={drafts[row.key].wage} disabled={busy === row.key}
                    onChange={e => setDrafts(d => ({ ...d, [row.key]: { ...d[row.key], wage: e.target.value } }))}
                    className="w-20 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-200 tabular-nums focus:outline-none focus:border-teal-500/40"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={drafts[row.key].tier} disabled={busy === row.key}
                    onChange={e => setDrafts(d => ({ ...d, [row.key]: { ...d[row.key], tier: e.target.value } }))}
                    className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-200 focus:outline-none focus:border-teal-500/40"
                  >
                    {[1, 2, 3, 4].map(t => <option key={t} value={t}>Stufe {t}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-end">
                    {row.overridden && (
                      <button
                        onClick={() => reset(row.key, { coinsPerHour: row.defaultCoinsPerHour, minRoomTier: row.defaultMinRoomTier })}
                        disabled={busy === row.key} title="Auf Katalogwerte zurücksetzen"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => save(row.key)} disabled={busy === row.key}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25 transition-colors disabled:opacity-50">
                      {busy === row.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Speichern"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

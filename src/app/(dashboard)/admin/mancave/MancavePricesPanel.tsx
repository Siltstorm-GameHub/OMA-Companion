"use client";
import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";

interface PriceRow {
  key: string; label: string; baseline: boolean;
  defaultCosts: [number, number, number, number];
  costs: [number, number, number, number];
  overridden: boolean;
}

const TIER_LABELS = ["Stufe 0→1", "Stufe 1→2", "Stufe 2→3", "Stufe 3→4"];

export function MancavePricesPanel({ initial }: { initial: PriceRow[] }) {
  const [rows, setRows] = useState<PriceRow[]>(initial);
  const [drafts, setDrafts] = useState<Record<string, [string, string, string, string]>>(
    Object.fromEntries(initial.map(r => [r.key, r.costs.map(String) as [string, string, string, string]])),
  );
  const [busy, setBusy] = useState<string | null>(null);

  function setDraft(key: string, idx: number, value: string) {
    setDrafts(d => {
      const row = [...d[key]] as [string, string, string, string];
      row[idx] = value;
      return { ...d, [key]: row };
    });
  }

  async function save(key: string) {
    const draft = drafts[key];
    const costs = draft.map(v => Number(v));
    if (costs.some(c => !Number.isFinite(c) || c < 0)) {
      toast.error("Nur nicht-negative Zahlen erlaubt");
      return;
    }
    setBusy(key);
    try {
      const res = await fetch("/api/admin/mancave-prices", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: key, costs }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Speichern fehlgeschlagen"); return; }
      setRows(rs => rs.map(r => r.key === key ? { ...r, costs: costs as [number, number, number, number], overridden: true } : r));
      toast.success("Preise gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(null);
    }
  }

  async function reset(key: string, defaultCosts: [number, number, number, number]) {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/mancave-prices", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: key, costs: null }),
      });
      if (!res.ok) { toast.error("Zurücksetzen fehlgeschlagen"); return; }
      setRows(rs => rs.map(r => r.key === key ? { ...r, costs: defaultCosts, overridden: false } : r));
      setDrafts(d => ({ ...d, [key]: defaultCosts.map(String) as [string, string, string, string] }));
      toast.success("Auf Katalogpreis zurückgesetzt");
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
              <th className="px-4 py-2.5 font-semibold">Objekt</th>
              {TIER_LABELS.map(l => <th key={l} className="px-2 py-2.5 font-semibold whitespace-nowrap">{l}</th>)}
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(row => (
              <tr key={row.key}>
                <td className="px-4 py-2 text-gray-200 whitespace-nowrap">
                  {row.label}
                  {row.overridden && <span className="ml-1.5 text-[9px] text-amber-400">●</span>}
                </td>
                {drafts[row.key].map((v, i) => (
                  <td key={i} className="px-2 py-2">
                    <input
                      type="number" min={0} value={v} disabled={busy === row.key}
                      onChange={e => setDraft(row.key, i, e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-200 tabular-nums focus:outline-none focus:border-teal-500/40"
                    />
                  </td>
                ))}
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-end">
                    {row.overridden && (
                      <button onClick={() => reset(row.key, row.defaultCosts)} disabled={busy === row.key}
                        title="Auf Katalogpreis zurücksetzen"
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "@/components/icons";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { formatDecimal } from "@/lib/format-number";

type Result = {
  recalculated: number;
  failed: { id: string; title: string; error: string }[];
  delta: { coins: number; rankPoints: number; tablePoints: number };
};

const signed = (n: number) => `${n > 0 ? "+" : ""}${formatDecimal(n)}`;

/** "Abgeschlossene Events neu berechnen" — wendet die gespeicherten Reihen-Einstellungen auf alle
 *  bereits beendeten Events der Reihe an (siehe /api/admin/series/[id]/recalculate). */
export default function RecalculateSeriesButton({ seriesId, finishedCount }: { seriesId: string; finishedCount: number }) {
  const router = useRouter();
  const { confirm, ConfirmDialogElement } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    const ok = await confirm({
      title: "Abgeschlossene Events neu berechnen",
      description:
        `${finishedCount} beendete${finishedCount === 1 ? "s Event wird" : " Events werden"} mit den aktuell GESPEICHERTEN Einstellungen der Reihe neu berechnet ` +
        "(Tabellenpunkte, Teilnahme- und Platzierungs-Belohnungen, Übertrag auf die Rangliste).\n\n" +
        "Sieger, Platzierungen, MVP, Ausschlüsse und Umfrage-Ergebnisse bleiben unverändert. Unterschiede bei Münzen und Punkten werden automatisch nach- bzw. zurückgebucht.\n\n" +
        "Ungespeicherte Änderungen oben vorher speichern!",
      confirmLabel: "Jetzt neu berechnen",
    });
    if (!ok) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/series/${seriesId}/recalculate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error((data as { error?: string }).error ?? "Neuberechnung fehlgeschlagen"); return; }
      const r = data as Result;
      setResult(r);
      if (r.failed.length > 0) toast.warning(`${r.recalculated} Events neu berechnet, ${r.failed.length} fehlgeschlagen`);
      else toast.success(`${r.recalculated} Events neu berechnet`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {ConfirmDialogElement}
      <button
        type="button"
        onClick={run}
        disabled={busy || finishedCount === 0}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-teal-600/40 bg-teal-700/15 hover:bg-teal-700/25 text-sm text-teal-300 disabled:opacity-40 transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Wird neu berechnet…" : `Abgeschlossene Events neu berechnen (${finishedCount})`}
      </button>
      {result && (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-gray-300 space-y-1">
          <p>{result.recalculated} Event{result.recalculated === 1 ? "" : "s"} neu berechnet. Änderungen insgesamt:</p>
          <p className="text-gray-400">
            Tabellenpunkte {signed(result.delta.tablePoints)} · Münzen {signed(result.delta.coins)} · Rang-Punkte {signed(result.delta.rankPoints)}
          </p>
          {result.failed.length > 0 && (
            <ul className="text-red-300 list-disc pl-4">
              {result.failed.map(f => <li key={f.id}>{f.title}: {f.error}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

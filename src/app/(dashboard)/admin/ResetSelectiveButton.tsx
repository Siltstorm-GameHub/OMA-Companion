"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

type SeriesOption = { id: string; name: string; status: string; seasonNumber: number | null; eventCount: number };

export default function ResetSelectiveButton({ series }: { series: SeriesOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keepIds, setKeepIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setKeepIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleReset() {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/reset-selective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepSeriesIds: [...keepIds] }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      toast.success(
        `✅ Zurückgesetzt — ${data.deletedSeriesCount} Reihe(n) & ${data.deletedEventCount} Event(s) gelöscht, ` +
        `${data.keptSeriesCount} Reihe(n) bewahrt`
      );
      setConfirmOpen(false);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass card-shine rounded-2xl p-4 border border-red-500/15">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <RotateCcw className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Selektiver Reset</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Setzt Münzen aller User auf 0 und löscht alle Events/Eventreihen — außer den hier ausgewählten
            Eventreihen. Deren Ligapunkte, Rang-Punkte und Event-Statistiken bleiben erhalten. Zusätzlich
            zurückgesetzt: LuL, Quest-Fortschritt, Duelle, Event-Vorhersagen, Shop-Inventar. Unangetastet:
            Abzeichen, Wanderpokale, Clip-Contests, Spendenpool.
          </p>

          <button
            onClick={() => setOpen(true)}
            className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset konfigurieren
          </button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Selektiver Reset — Reihen auswählen" size="md">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Wähle die Eventreihen, die <strong className="text-gray-300">bewahrt</strong> werden sollen.
            Alle anderen Reihen &amp; eigenständigen Events werden vollständig gelöscht.
          </p>

          {series.length === 0 ? (
            <p className="text-sm text-gray-600">Keine Eventreihen vorhanden.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {series.map(s => (
                <label key={s.id}
                  className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 cursor-pointer hover:border-white/15 transition-colors">
                  <input type="checkbox" checked={keepIds.has(s.id)} onChange={() => toggle(s.id)}
                    className="rounded accent-teal-500 shrink-0" />
                  <span className="flex-1 min-w-0 text-sm text-gray-200 truncate">
                    {s.name}
                    {s.seasonNumber ? <span className="text-gray-600"> · Saison {s.seasonNumber}</span> : null}
                  </span>
                  <span className="text-[10px] text-gray-600 shrink-0">{s.eventCount} Events</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                    s.status === "archived" ? "text-gray-500 border-white/10" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                  }`}>{s.status === "archived" ? "archiviert" : "aktiv"}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={() => setOpen(false)}
              className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/20 transition-colors">
              Abbrechen
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Weiter ({keepIds.size} Reihe{keepIds.size === 1 ? "" : "n"} bewahren)
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Selektiven Reset durchführen"
        description={
          `Münzen aller User werden auf 0 gesetzt. Alle Eventreihen & Events außer den ${keepIds.size} ` +
          `ausgewählten werden unwiderruflich gelöscht (inkl. Anmeldungen, Turniere, Umfragen). ` +
          `LuL, Quest-Fortschritt, Duelle, Event-Vorhersagen und Shop-Inventar werden ebenfalls zurückgesetzt.\n\n` +
          `Nicht rückgängig zu machen.`
        }
        confirmLabel="Ja, jetzt zurücksetzen"
        variant="danger"
        typedConfirmText="ZURÜCKSETZEN"
        loading={loading}
        onConfirm={handleReset}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

export default function ResetHistoryButton() {
  const router = useRouter();
  const [confirm,  setConfirm]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-history", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      toast.success(`✅ Bereinigung abgeschlossen — ${data.deletedTransactions} Transaktionen gelöscht, ${data.affectedUsers} User aktualisiert`);
      setDone(true);
      setConfirm(false);
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        ✅ Punktehistorie wurde bereinigt
      </div>
    );
  }

  return (
    <div className="glass card-shine rounded-2xl p-4 border border-red-500/15">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Punktehistorie bereinigen</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Löscht alle Transaktionen <strong className="text-gray-400">vor dem 5.6.2026</strong>.
            Behält: LUL Season 1 + R6 Siege Weekly Evening (6.6.2026) und alles danach.
            Münzen werden für alle User neu berechnet.
          </p>

          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" /> Bereinigung starten
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <p className="text-xs text-red-300 font-medium w-full">⚠️ Nicht rückgängig zu machen — wirklich fortfahren?</p>
              <button
                onClick={handleReset}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Ja, jetzt bereinigen
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-gray-500 hover:text-white transition-colors"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

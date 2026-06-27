"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2, Trophy } from "lucide-react";

export default function WanderpocalRecomputeButton() {
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  async function handleRecompute() {
    setLoading(true);
    try {
      const res = await fetch("/api/wanderpocal/recompute", { method: "POST" });
      if (!res.ok) { toast.error("Fehler beim Neuberechnen"); return; }
      toast.success("✅ Wanderpokal-Halter wurden neu berechnet");
      setDone(true);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass card-shine rounded-2xl p-4 border border-amber-500/15">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Wanderpokal neu berechnen</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Wertet alle abgeschlossenen Events aus und aktualisiert die Pokal-Halter für alle Kategorien und Genres.
            Einmalig nötig für historische Events — danach läuft die Berechnung automatisch.
          </p>
          {done ? (
            <p className="mt-3 text-xs text-emerald-400 font-medium">✅ Erfolgreich neuberechnet</p>
          ) : (
            <button
              onClick={handleRecompute}
              disabled={loading}
              className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:border-amber-500/30 transition-colors font-medium disabled:opacity-50"
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              {loading ? "Berechne…" : "Jetzt berechnen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

// ============================================
// Battle-Cards-Matchmaking — "Zufallsgegner suchen"
// ============================================
// Beitreten reiht in eine serverseitige Warteschlange ein; sobald ein
// zweiter User ebenfalls beitritt, wird sofort gematcht (kein
// Einladen/Annehmen). Während des Wartens pollen wir den Status.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Swords, Loader2, X } from "lucide-react";

const POLL_INTERVAL_MS = 2500;

export default function MatchmakingWidget() {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function handleMatch(liveBattleId: string | null) {
    stopPolling();
    setWaiting(false);
    toast.success("Zufallsgegner gefunden — Kampf startet!");
    if (liveBattleId) router.push(`/battle-cards/live/${liveBattleId}`);
    router.refresh();
  }

  async function join() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/battle-cards/queue", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler");
        return;
      }
      if (data.matched) {
        handleMatch(data.liveBattleId ?? null);
        return;
      }
      setWaiting(true);
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch("/api/battle-cards/queue");
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();
          if (pollData.matched) handleMatch(pollData.liveBattleId ?? null);
        } catch { /* ignore, try again next tick */ }
      }, POLL_INTERVAL_MS);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    stopPolling();
    setWaiting(false);
    try {
      await fetch("/api/battle-cards/queue", { method: "DELETE" });
    } catch { /* egal, State ist schon zurückgesetzt */ }
  }

  if (waiting) {
    return (
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(180deg, #1c1710 0%, #14120c 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1.5px rgba(251,191,36,0.35), 0 3px 0 rgba(120,53,15,0.6)",
        }}
      >
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">Suche Zufallsgegner…</p>
          <p className="text-xs text-gray-500">Sobald jemand anderes beitritt, wird sofort gekämpft.</p>
        </div>
        <button
          onClick={cancel}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" /> Abbrechen
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={join}
      disabled={busy}
      className="w-full rounded-2xl p-4 flex items-center gap-3 text-left active:translate-y-0.5 transition-transform disabled:opacity-50"
      style={{
        background: "linear-gradient(180deg, #23191c 0%, #181215 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1.5px rgba(251,113,133,0.35), 0 3px 0 #7f1130, 0 8px 16px rgba(225,29,72,0.2)",
      }}
    >
      <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
        <Swords className="w-4 h-4 text-rose-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Zufallsgegner suchen</p>
        <p className="text-xs text-gray-500">Sofortiges Match gegen den nächsten wartenden Spieler.</p>
      </div>
    </button>
  );
}

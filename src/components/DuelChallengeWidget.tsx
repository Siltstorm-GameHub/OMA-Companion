"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Swords } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

export default function DuelChallengeWidget({
  opponentId,
  opponentName,
  config,
}: {
  opponentId: string;
  opponentName: string;
  config: { min: number; max: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wager, setWager] = useState(config.min);
  const [submitting, setSubmitting] = useState(false);

  async function challenge() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId, wager }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      toast.success(`Herausforderung an ${opponentName} gesendet!`);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 transition-colors"
      >
        <Swords className="w-3.5 h-3.5" /> Zum Münzenduell herausfordern
      </button>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 w-full max-w-xs">
      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
        <Swords className="w-3.5 h-3.5 text-rose-400" /> {opponentName} herausfordern
      </p>
      <div className="flex items-center gap-3">
        <label className="flex-1">
          <span className="text-xs text-gray-500">Einsatz</span>
          <input
            type="number"
            min={config.min}
            max={config.max}
            value={wager}
            onChange={e => setWager(Math.max(config.min, Math.min(config.max, parseInt(e.target.value, 10) || config.min)))}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500/50"
          />
        </label>
        <div className="text-xs text-gray-500 pt-4 flex items-center gap-1">
          Gewinn: <span className="text-amber-400 font-semibold flex items-center gap-0.5">{wager * 2} <CoinIcon size={12} /></span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={challenge}
          disabled={submitting}
          className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
        >
          {submitting ? "Sendet…" : "Herausfordern"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

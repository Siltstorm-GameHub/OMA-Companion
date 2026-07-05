"use client";
import { useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Target } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

type Candidate = { id: string; name: string; image: string | null };
type MyPrediction = { predictedUserId: string; resolved: boolean; correct: boolean | null; coinsAwarded: number } | null;

export default function PredictionWidget({
  matchId,
  candidates,
  myPrediction,
  locked,
  compact = false,
}: {
  matchId: string;
  candidates: Candidate[];
  myPrediction: MyPrediction;
  /** true wenn das Match bereits läuft/gespielt wurde oder scheduledAt vorbei ist */
  locked: boolean;
  /** kompakte Darstellung für den Turnierbaum (kleinere Cards) */
  compact?: boolean;
}) {
  const [prediction, setPrediction] = useState(myPrediction);
  const [submitting, setSubmitting] = useState(false);

  if (candidates.length < 2) return null;

  async function pick(predictedUserId: string) {
    if (submitting || locked) return;
    setSubmitting(true);
    const prev = prediction;
    setPrediction({ predictedUserId, resolved: false, correct: null, coinsAwarded: 0 });
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, predictedUserId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Tipp konnte nicht gespeichert werden");
        setPrediction(prev);
        return;
      }
      toast.success("Tipp gespeichert 🎯");
    } catch {
      toast.error("Netzwerkfehler");
      setPrediction(prev);
    } finally {
      setSubmitting(false);
    }
  }

  // Bereits ausgewertet: Ergebnis-Chip
  if (prediction?.resolved) {
    const won = prediction.correct;
    if (won) {
      // kleiner Confetti-Burst beim ersten Rendern des Treffers (nur einmalig sichtbar, harmlos bei Re-Renders)
      queueMicrotask(() => {
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 }, colors: ["#f59e0b", "#fcd34d", "#ffffff"] });
      });
    }
    const pickedName = candidates.find(c => c.id === prediction.predictedUserId)?.name ?? "?";
    return (
      <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
        won ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-white/[0.03] border border-white/[0.06] text-gray-500"
      }`}>
        <Target className="w-3 h-3 shrink-0" />
        <span className="truncate">
          {won ? "✅" : "❌"} Du hast auf <span className="font-medium">{pickedName}</span> getippt
          {won && prediction.coinsAwarded > 0 && (
            <span className="inline-flex items-center gap-0.5 ml-1 text-amber-400 font-semibold">
              +{prediction.coinsAwarded} <CoinIcon size={11} />
            </span>
          )}
        </span>
      </div>
    );
  }

  // Ausstehend (Tipp abgegeben, noch kein Ergebnis)
  if (prediction && !prediction.resolved) {
    const pickedName = candidates.find(c => c.id === prediction.predictedUserId)?.name ?? "?";
    return (
      <button
        onClick={() => !locked && setPrediction(null)}
        disabled={locked}
        title={locked ? "Tipp-Abgabe ist gesperrt" : "Klicken um Tipp zu ändern"}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/15 transition-colors disabled:hover:bg-violet-500/10"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
        Du hast auf <span className="font-medium">{pickedName}</span> getippt
      </button>
    );
  }

  if (locked) return null;

  // Tipp-Abgabe
  return (
    <div className={compact ? "px-1 py-1" : "px-1"}>
      {!compact && (
        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1 flex items-center gap-1">
          <Target className="w-3 h-3" /> Wer gewinnt?
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {candidates.map(c => (
          <button
            key={c.id}
            onClick={() => pick(c.id)}
            disabled={submitting}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg glass-heavy border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/[0.06] transition-colors disabled:opacity-50"
          >
            {c.image ? (
              <img src={c.image} alt="" className="w-4 h-4 rounded-full shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-white/[0.06] flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">
                {c.name[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <span className="truncate max-w-[80px]">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

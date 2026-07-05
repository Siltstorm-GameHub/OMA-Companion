"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Target, Trash2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null };

export type MyPrediction = {
  eventId: string;
  eventTitle: string;
  eventStartAt: string;
  predictedUser: UserLite;
  resolved: boolean;
  correct: boolean | null;
  coinsAwarded: number;
};

const uname = (u: UserLite) => u.username ?? u.name ?? "?";

export default function MyPredictionsList({ initialPredictions }: { initialPredictions: MyPrediction[] }) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(eventId: string) {
    if (deletingId) return;
    setDeletingId(eventId);
    const prev = predictions;
    setPredictions(p => p.filter(x => x.eventId !== eventId));
    try {
      const res = await fetch("/api/predictions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        setPredictions(prev);
        toast.error("Löschen fehlgeschlagen");
        return;
      }
      toast.success("Vorhersage gelöscht");
    } catch {
      setPredictions(prev);
      toast.error("Netzwerkfehler");
    } finally {
      setDeletingId(null);
    }
  }

  if (predictions.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-gray-500 text-sm">
        Noch keine Vorhersagen abgegeben.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl divide-y divide-white/5">
      {predictions.map(p => (
        <div key={p.eventId} className="flex items-center gap-3 px-4 py-3">
          <Link href={`/tournament/${p.eventId}`} className="flex-1 min-w-0 flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate group-hover:text-violet-300 transition-colors">{p.eventTitle}</p>
              <p className="text-xs text-gray-500 truncate">
                Tipp: <span className="text-gray-400">{uname(p.predictedUser)}</span>
                <span className="text-gray-700"> · {new Date(p.eventStartAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              </p>
            </div>
            {p.resolved ? (
              <span className={`text-xs font-semibold shrink-0 flex items-center gap-1 ${p.correct ? "text-emerald-400" : "text-gray-500"}`}>
                {p.correct ? "✅ Richtig" : "❌ Falsch"}
                {p.correct && p.coinsAwarded > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-400">+{p.coinsAwarded} <CoinIcon size={11} /></span>
                )}
              </span>
            ) : (
              <span className="text-xs text-gray-600 shrink-0">Ausstehend</span>
            )}
          </Link>
          <button
            onClick={() => handleDelete(p.eventId)}
            disabled={deletingId === p.eventId}
            title="Vorhersage löschen"
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

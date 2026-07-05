"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Target, Search, X } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null };
type Prediction = {
  predictedUserId: string;
  resolved: boolean;
  correct: boolean | null;
  coinsAwarded: number;
  predictedUser: UserLite;
} | null;

const uname = (u?: UserLite | null) => u?.username ?? u?.name ?? "?";

export default function EventWinnerPredictionWidget({
  eventId,
  locked,
  initialPrediction,
}: {
  eventId: string;
  locked: boolean;
  initialPrediction: Prediction;
}) {
  const [prediction, setPrediction] = useState<Prediction>(initialPrediction);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function pick(u: UserLite) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, predictedUserId: u.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Tipp konnte nicht gespeichert werden"); return; }
      setPrediction({ predictedUserId: u.id, resolved: false, correct: null, coinsAwarded: 0, predictedUser: u });
      setEditing(false);
      setQuery("");
      setResults([]);
      toast.success(`Tipp gespeichert: ${uname(u)} gewinnt 🎯`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  // Bereits ausgewertet
  if (prediction?.resolved) {
    if (prediction.correct) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, colors: ["#f59e0b", "#fcd34d", "#ffffff"] });
    }
    return (
      <div className={`glass rounded-2xl p-4 flex items-center gap-3 ${
        prediction.correct ? "border border-emerald-500/20" : "border border-white/5"
      }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          prediction.correct ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/[0.04] border border-white/10"
        }`}>
          <Target className={`w-4 h-4 ${prediction.correct ? "text-emerald-400" : "text-gray-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">
            {prediction.correct ? "✅ Richtig getippt!" : "❌ Leider daneben"}
          </p>
          <p className="text-xs text-gray-500">Du hast auf {uname(prediction.predictedUser)} getippt</p>
        </div>
        {prediction.correct && prediction.coinsAwarded > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-400 shrink-0">
            +{prediction.coinsAwarded} <CoinIcon size={14} />
          </span>
        )}
      </div>
    );
  }

  // Ausstehend (Tipp abgegeben, Event noch nicht beendet)
  if (prediction && !editing) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">Du tippst auf <span className="font-semibold">{uname(prediction.predictedUser)}</span></p>
          <p className="text-xs text-gray-500">Gesamtsieger-Vorhersage</p>
        </div>
        {!locked && (
          <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-white transition-colors shrink-0">
            Ändern
          </button>
        )}
      </div>
    );
  }

  if (locked) {
    return prediction ? null : (
      <div className="glass rounded-2xl p-4 text-center text-sm text-gray-500">
        Tipp-Abgabe für dieses Event ist gesperrt.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-violet-400 shrink-0" />
        <p className="text-sm font-semibold text-white">Wer gewinnt dieses Event?</p>
        {editing && (
          <button onClick={() => setEditing(false)} className="ml-auto text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nutzer suchen — auch nicht angemeldete Mitglieder…"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full glass-heavy rounded-xl overflow-hidden border border-white/10">
            {results.map(u => (
              <button key={u.id} disabled={submitting} onClick={() => pick(u)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.06] text-left disabled:opacity-50">
                {u.image ? (
                  <img src={u.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                    {uname(u)[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="text-sm text-white">{uname(u)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Dices } from "lucide-react";

const REEL_ITEMS = [
  { label: "10 Punkte",  color: "text-gray-400",   bg: "bg-gray-500/10"   },
  { label: "25 Punkte",  color: "text-blue-400",   bg: "bg-blue-500/10"   },
  { label: "50 Punkte",  color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "100 Punkte", color: "text-amber-400",  bg: "bg-amber-500/10"  },
  { label: "200 Punkte", color: "text-orange-400", bg: "bg-orange-500/10" },
  { label: "500 Punkte", color: "text-rose-400",   bg: "bg-rose-500/10"   },
  { label: "Kein Glück", color: "text-gray-600",   bg: "bg-white/[0.04]"  },
];

interface Props {
  alreadySpun: boolean;
  lastResult:  { prizeLabel: string; prizeType: string } | null;
}

export default function DailySpin({ alreadySpun, lastResult }: Props) {
  const router = useRouter();
  const [spinning,  setSpinning]  = useState(false);
  const [done,      setDone]      = useState(alreadySpun);
  const [result,    setResult]    = useState(lastResult);
  const [reelIndex, setReelIndex] = useState(0);

  async function handleSpin() {
    if (done || spinning) return;
    setSpinning(true);

    // Reel-Animation starten (schnelles Wechseln)
    let tick = 0;
    const interval = setInterval(() => {
      setReelIndex(i => (i + 1) % REEL_ITEMS.length);
      tick++;
      if (tick > 25) clearInterval(interval); // ~2.5s
    }, 80);

    try {
      const res  = await fetch("/api/shop/spin", { method: "POST" });
      const data = await res.json();

      // Warten bis Animation fertig
      await new Promise(r => setTimeout(r, 2500));
      clearInterval(interval);

      if (!res.ok) { toast.error(data.error ?? "Fehler"); setSpinning(false); return; }

      // Reel auf Ergebnis setzen
      const resultIdx = REEL_ITEMS.findIndex(r => r.label === data.prize.label);
      setReelIndex(resultIdx >= 0 ? resultIdx : 0);

      setResult({ prizeLabel: data.prize.label, prizeType: data.prize.type });
      setDone(true);

      if (data.prize.type === "points") {
        toast.success(`🎰 ${data.prize.label} gewonnen!`);
      } else {
        toast("🎰 Heute kein Glück — morgen wieder!", { description: "Drehe morgen erneut." });
      }

      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSpinning(false);
    }
  }

  const current = REEL_ITEMS[reelIndex];

  return (
    <div className="glass card-shine rounded-2xl border border-amber-500/15 overflow-hidden">
      <div className="flex items-center gap-4 p-4 flex-wrap">

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Dices className="w-5 h-5 text-amber-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Täglicher Gratis-Spin</p>
          <p className="text-xs text-gray-500">Einmal täglich drehen — gewinne bis zu 500 Punkte!</p>
        </div>

        {/* Reel display */}
        <div className={`px-4 py-2 rounded-xl border text-sm font-bold tabular-nums min-w-[120px] text-center transition-all duration-75 ${current.color} ${current.bg} border-white/[0.08]`}>
          {done ? (result?.prizeLabel ?? current.label) : spinning ? current.label : "❓ ???"}
        </div>

        {/* Button */}
        <button
          onClick={handleSpin}
          disabled={done || spinning}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            done
              ? "bg-white/[0.04] text-gray-600 border border-white/[0.06] cursor-not-allowed"
              : "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.3)] active:scale-[0.97]"
          }`}>
          {spinning ? <Loader2 className="w-4 h-4 animate-spin" /> : "🎰"}
          {done ? "Bereits gedreht" : spinning ? "Läuft..." : "Drehen!"}
        </button>
      </div>

      {done && result && (
        <div className="border-t border-white/[0.04] px-4 py-2 text-xs text-gray-600">
          Heutiges Ergebnis: <span className="text-amber-400 font-medium">{result.prizeLabel}</span> · Nächster Spin in{" "}
          {(() => {
            const now = new Date();
            const midnight = new Date(now); midnight.setHours(24,0,0,0);
            const h = Math.floor((midnight.getTime() - now.getTime()) / 3600000);
            const m = Math.floor(((midnight.getTime() - now.getTime()) % 3600000) / 60000);
            return `${h}h ${m}m`;
          })()}
        </div>
      )}
    </div>
  );
}

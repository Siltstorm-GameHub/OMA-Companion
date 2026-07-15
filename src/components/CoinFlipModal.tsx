"use client";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null };

const uname = (u?: UserLite) => u?.username ?? u?.name ?? "?";

function FaceAvatar({ u }: { u?: UserLite }) {
  if (u?.image) return <img src={u.image} alt="" className="w-full h-full object-cover rounded-full" />;
  return (
    <div className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-lg bg-white/[0.06]">
      {uname(u)[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function CoinFlipModal({
  challenger,
  opponent,
  winnerId,
  wager,
  currentUserId,
  onClose,
}: {
  challenger?: UserLite;
  opponent?: UserLite;
  winnerId: string;
  wager: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"flipping" | "done">("flipping");
  const coinRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const challengerWon = winnerId === challenger?.id;
  const userWon = winnerId === currentUserId;

  useEffect(() => {
    const spins = 6;
    const finalAngle = spins * 360 + (challengerWon ? 0 : 180);
    const duration = 2600;
    const start = performance.now();

    function frame(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const angle = finalAngle * ease;
      if (coinRef.current) coinRef.current.style.transform = `rotateY(${angle}deg)`;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setPhase("done");
        if (userWon) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#f43f5e", "#f59e0b", "#ffffff"] });
        }
      }
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <style>{`
        @keyframes coinFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .coin-float { animation: coinFloat 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .coin-float { animation: none !important; } }
      `}</style>
      <div className="glass-heavy rounded-3xl p-6 w-full max-w-sm space-y-5 text-center border border-white/10">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Münzenduell</p>

        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1.5 w-16">
            <div className={`w-12 h-12 rounded-full overflow-hidden ring-2 transition-colors ${phase === "done" && challengerWon ? "ring-emerald-400" : "ring-white/10"}`}>
              <FaceAvatar u={challenger} />
            </div>
            <span className="text-[11px] text-gray-400 truncate w-full">{uname(challenger)}</span>
          </div>

          <div style={{ perspective: 600 }} className={phase === "flipping" ? "coin-float shrink-0" : "shrink-0"}>
            <div
              ref={coinRef}
              className="relative w-20 h-20"
              style={{ transformStyle: "preserve-3d", willChange: "transform" }}
            >
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.5)]"
                style={{ backfaceVisibility: "hidden", background: "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 60%, #b45309)" }}
              >
                <CoinIcon size={40} />
              </div>
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(244,63,94,0.5)]"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "radial-gradient(circle at 35% 30%, #fecdd3, #f43f5e 60%, #881337)" }}
              >
                <CoinIcon size={40} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 w-16">
            <div className={`w-12 h-12 rounded-full overflow-hidden ring-2 transition-colors ${phase === "done" && !challengerWon ? "ring-emerald-400" : "ring-white/10"}`}>
              <FaceAvatar u={opponent} />
            </div>
            <span className="text-[11px] text-gray-400 truncate w-full">{uname(opponent)}</span>
          </div>
        </div>

        <div className="min-h-[52px] flex flex-col items-center justify-center gap-1">
          {phase === "flipping" ? (
            <p className="text-sm text-gray-400 animate-pulse">Die Münze fliegt…</p>
          ) : (
            <>
              <p className={`text-lg font-bold flex items-center gap-1.5 ${userWon ? "text-emerald-400" : "text-gray-300"}`}>
                {userWon && <Trophy className="w-5 h-5" />}
                {userWon ? "Gewonnen!" : "Verloren"}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {userWon ? `+${wager * 2}` : `-${wager}`} <CoinIcon size={11} />
              </p>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          disabled={phase === "flipping"}
          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

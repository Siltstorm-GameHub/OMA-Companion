"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import Image from "next/image";
import CoinIcon from "@/components/CoinIcon";
import { GENRE_ICON_MAP, clicksRequiredForLevel, type GenreKey } from "@/lib/clicker";

type BonusIcon = { genre: string; expiresAt: string } | null;

interface ClickerState {
  clicksToday: number;
  coinsToday: number;
  cap: number;
  level: number;
  totalClicks: number;
  nextLevelAt: number;
  coinsPerClick: number;
  bonusIcon: BonusIcon;
}

function useMidnightCountdown() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function calc() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setLabel(`${h}h ${m}m`);
    }
    calc();
    const id = setInterval(calc, 30_000);
    return () => clearInterval(id);
  }, []);
  return label;
}

let floaterSeq = 0;

/** Deterministische Pseudo-Position aus Genre+Ablaufzeit (kein Math.random() während des Renderns) */
function hashPosition(seed: string): { top: number; left: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const top = 15 + ((h % 1000) / 1000) * 55;
  const left = 10 + (((h >>> 3) % 1000) / 1000) * 70;
  return { top, left };
}

export default function ClickerGame({ initial }: { initial: ClickerState }) {
  const [state, setState] = useState<ClickerState>(initial);
  const [pressed, setPressed] = useState(false);
  const [floaters, setFloaters] = useState<{ id: number; text: string; positive: boolean }[]>([]);
  const countdown = useMidnightCountdown();
  const clickingRef = useRef(false);

  const capReached = state.coinsToday >= state.cap;
  const currentLevelAt = clicksRequiredForLevel(state.level);
  const levelSpan = Math.max(1, state.nextLevelAt - currentLevelAt);
  const levelProgress = Math.min(100, Math.round(((state.totalClicks - currentLevelAt) / levelSpan) * 100));

  // Position des Bonus-Icons: einmalig pro Icon-Instanz (Genre+Ablaufzeit) deterministisch bestimmen
  const bonusPos = useMemo(() => {
    if (!state.bonusIcon) return null;
    return hashPosition(state.bonusIcon.genre + state.bonusIcon.expiresAt);
  }, [state.bonusIcon]);

  const addFloater = useCallback((text: string, positive = true) => {
    const id = ++floaterSeq;
    setFloaters(prev => [...prev, { id, text, positive }]);
    setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== id)), 900);
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/minigames/clicker/click");
      if (!res.ok) return;
      const data = await res.json();
      setState(prev => ({ ...prev, ...data }));
    } catch { /* Poll-Fehler ignorieren */ }
  }, []);

  useEffect(() => {
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [poll]);

  // Bonus-Icon lokal ausblenden, sobald die Ablaufzeit erreicht ist
  useEffect(() => {
    if (!state.bonusIcon) return;
    const ms = Math.max(0, new Date(state.bonusIcon.expiresAt).getTime() - Date.now());
    const t = setTimeout(() => setState(s => ({ ...s, bonusIcon: null })), ms);
    return () => clearTimeout(t);
  }, [state.bonusIcon]);

  async function handleClick() {
    if (clickingRef.current) return;
    clickingRef.current = true;
    setPressed(true);
    setTimeout(() => setPressed(false), 90);

    try {
      const res = await fetch("/api/minigames/clicker/click", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }

      setState(prev => ({ ...prev, ...data }));

      if (data.ignored) { /* zu schnell geklickt, Server hat ignoriert */ }
      else if (data.earned > 0) addFloater(`+${data.earned}`, true);
      else addFloater("+0", false);

      if (data.leveledUp) {
        toast.success(`🎉 Level ${data.level} erreicht — jetzt ${data.coinsPerClick} Münzen/Klick!`);
        confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 }, colors: ["#a78bfa", "#f59e0b", "#ffffff"] });
      }
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      clickingRef.current = false;
    }
  }

  async function handleClaimBonus() {
    const genre = state.bonusIcon?.genre;
    setState(prev => ({ ...prev, bonusIcon: null }));
    try {
      const res = await fetch("/api/minigames/clicker/bonus-icon/claim", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return;
      setState(prev => ({ ...prev, coinsToday: prev.coinsToday + data.earned }));
      const label = genre ? (GENRE_ICON_MAP[genre as GenreKey]?.label ?? genre) : "Bonus";
      addFloater(`+${data.earned}`, true);
      toast.success(`🎁 ${label}-Icon gefangen: +${data.earned} Münzen!`);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#34d399", "#f59e0b", "#ffffff"] });
    } catch { /* Icon evtl. schon abgelaufen — kein Fehler-Toast nötig */ }
  }

  return (
    <>
      <style>{`
        @keyframes floatUp { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
        @keyframes bonusFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .floater { animation: floatUp 0.9s ease-out forwards; }
        .bonus-float { animation: bonusFloat 2s ease-in-out infinite; }
      `}</style>

      <div className="glass rounded-2xl border border-violet-500/15 overflow-hidden">
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <span className="text-xl">🖱️</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Idle-Clicker</p>
              <p className="text-xs text-gray-500">Level {state.level} · {state.coinsPerClick} Münzen/Klick</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <CoinIcon size={16} />
              <span className="text-sm font-bold text-amber-400 tabular-nums">{state.coinsToday}/{state.cap}</span>
            </div>
          </div>

          {/* Tages-Cap-Fortschritt */}
          <div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full bg-amber-500/70 transition-all" style={{ width: `${Math.min(100, (state.coinsToday / state.cap) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>Tages-Cap</span>
              {capReached && <span className="text-amber-400">Erreicht — Reset in {countdown}</span>}
            </div>
          </div>

          {/* Level-Fortschritt */}
          <div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full bg-violet-500/70 transition-all" style={{ width: `${levelProgress}%` }} />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">Noch {Math.max(0, state.nextLevelAt - state.totalClicks)} Taps bis Level {state.level + 1}</p>
          </div>

          {/* Spielfläche */}
          <div className="relative rounded-xl overflow-hidden" style={{ height: 260, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {state.bonusIcon && bonusPos && (
              <button
                onClick={handleClaimBonus}
                className="bonus-float absolute z-10 w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                style={{ top: `${bonusPos.top}%`, left: `${bonusPos.left}%`, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.4)", boxShadow: "0 0 16px rgba(52,211,153,0.35)" }}
                title="Bonus einsammeln!"
              >
                <Image src={GENRE_ICON_MAP[state.bonusIcon.genre as GenreKey]?.icon ?? "/Game Icon.png"} alt="" width={22} height={22} className="object-contain" />
              </button>
            )}

            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handleClick}
                className={`relative w-32 h-32 rounded-full font-black text-black text-sm transition-transform ${pressed ? "scale-90" : "scale-100"}`}
                style={{ background: "radial-gradient(circle at 35% 30%, #c4b5fd, #7c3aed)", boxShadow: "0 0 32px rgba(124,58,237,0.45)" }}
              >
                TAP
              </button>
              {floaters.map(f => (
                <span key={f.id}
                  className={`floater absolute text-sm font-bold pointer-events-none ${f.positive ? "text-amber-400" : "text-gray-600"}`}
                  style={{ top: "35%" }}
                >
                  {f.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

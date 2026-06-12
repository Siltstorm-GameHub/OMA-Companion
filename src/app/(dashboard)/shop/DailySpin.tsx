"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
      const s = Math.floor((diff % 60_000) / 1_000);
      setLabel(`${h}h ${m}m ${s}s`);
    }
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, []);
  return label;
}

// ── Segmente im Uhrzeigersinn ab 12 Uhr ───────────────────────────────────
const SEGMENTS = [
  { label: "200 Münzen", line1: "200",  line2: "Münzen", fill: "#e11d48", text: "#fda4af" },
  { label: "10 Münzen",  line1: "10",   line2: "Münzen", fill: "#374151", text: "#9ca3af" },
  { label: "100 Münzen", line1: "100",  line2: "Münzen", fill: "#d97706", text: "#fef08a" },
  { label: "Kein Glück", line1: "Kein", line2: "Glück",  fill: "#111827", text: "#4b5563" },
  { label: "200 Münzen", line1: "200",  line2: "Münzen", fill: "#ea580c", text: "#fed7aa" },
  { label: "25 Münzen",  line1: "25",   line2: "Münzen", fill: "#2563eb", text: "#bfdbfe" },
  { label: "50 Münzen",  line1: "50",   line2: "Münzen", fill: "#059669", text: "#a7f3d0" },
];

const N       = SEGMENTS.length;
const SEG     = 360 / N;          // ≈ 51.43° pro Segment
const SPIN_MS = 6000;
const CX = 150, CY = 150, R = 135, R_TEXT = 90;

// ── SVG-Hilfsfunktionen ────────────────────────────────────────────────────
function pt(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}
function segPath(i: number) {
  const { x: sx, y: sy } = pt(R, i * SEG);
  const { x: ex, y: ey } = pt(R, (i + 1) * SEG);
  return `M${CX},${CY} L${sx},${sy} A${R},${R},0,0,1,${ex},${ey} Z`;
}

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  alreadySpun: boolean;
  lastResult: { prizeLabel: string; prizeType: string } | null;
}

export default function DailySpin({ alreadySpun, lastResult }: Props) {
  const countdown = useMidnightCountdown();
  const router = useRouter();
  const [spinning,  setSpinning]  = useState(false);
  const [done,      setDone]      = useState(alreadySpun);
  const [result,    setResult]    = useState(lastResult);
  const [deg,       setDeg]       = useState(() => {
    // Beim Laden: letztes Ergebnis zeigen falls vorhanden
    if (!alreadySpun || !lastResult) return 0;
    const idx = SEGMENTS.findIndex(s => s.label === lastResult.prizeLabel);
    if (idx < 0) return 0;
    return (360 - (idx + 0.5) * SEG + 3600) % 360;
  });
  const [animating, setAnimating] = useState(false);

  async function handleSpin() {
    if (done || spinning) return;
    setSpinning(true);
    try {
      const res  = await fetch("/api/shop/spin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }

      // Gewinnfeld berechnen
      const segIdx      = SEGMENTS.findIndex(s => s.label === data.prize.label);
      const targetAngle = (segIdx + 0.5) * SEG;                      // Mitte des Segments im Rad
      const targetDeg   = (360 - targetAngle + 3600) % 360;          // Rotation für Zeiger oben
      const delta       = (targetDeg - (deg % 360) + 360) % 360;
      const finalDeg    = deg + (delta === 0 ? 360 : delta) + 360 * 6; // mind. 6 Runden

      setAnimating(true);
      setDeg(finalDeg);
      await new Promise(r => setTimeout(r, SPIN_MS + 400));
      setAnimating(false);

      setResult({ prizeLabel: data.prize.label, prizeType: data.prize.type });
      setDone(true);

      if (data.prize.type === "points") toast.success(`🎰 ${data.prize.label} gewonnen!`);
      else toast("🎰 Heute kein Glück — morgen wieder!", { description: "Drehe morgen erneut." });

      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSpinning(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes pointerTick {
          0%   { transform: rotate(0deg); }
          28%  { transform: rotate(-15deg); }
          55%  { transform: rotate(9deg); }
          78%  { transform: rotate(-6deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes glowSpin {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        @keyframes resultPop {
          0%   { transform: scale(0.88); opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .spin-transition {
          transition: transform var(--spin-ms) cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pointer-tick {
          transform-origin: 50% 100%;
          animation: pointerTick 0.19s ease-in-out infinite;
        }
        .glow-spin {
          animation: glowSpin 0.38s ease-in-out infinite;
        }
        .result-pop {
          animation: resultPop 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .spin-transition { transition: none !important; }
          .pointer-tick    { animation: none !important; }
          .glow-spin       { animation: none !important; }
          .result-pop      { animation: none !important; }
        }
      `}</style>
      <div className="glass card-shine rounded-2xl border border-amber-500/15 overflow-hidden">
      <div className="p-5 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <span className="text-xl">🎡</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Täglicher Gratis-Spin</p>
            <p className="text-xs text-gray-500">Einmal täglich drehen — gewinne bis zu 200 Münzen!</p>
          </div>
        </div>

        {/* Glücksrad */}
        <div className="flex flex-col items-center gap-4">
          {/* Äußerer Wrapper: kein overflow-hidden, damit der Zeiger sichtbar bleibt */}
          <div className="relative" style={{ width: 264 }}>

            {/* Zeiger — sitzt außerhalb des Clip-Containers */}
            <div className="absolute z-20 pointer-events-none"
              style={{ top: -2, left: "50%", transform: "translateX(-50%)" }}>
              <div className={spinning ? "pointer-tick" : undefined}>
                <svg width="24" height="32" viewBox="0 0 24 32">
                  <polygon points="12,30 1,3 23,3"
                    fill="#f59e0b"
                    stroke="#78350f"
                    strokeWidth="1"
                    filter="drop-shadow(0 2px 6px rgba(0,0,0,0.8))" />
                </svg>
              </div>
            </div>

            {/* Clip-Container: zeigt nur die obere Hälfte */}
            <div style={{ width: 264, height: 132, overflow: "hidden", position: "relative" }}>

              {/* Glow-Ring */}
              <div
                className={`absolute pointer-events-none${spinning ? " glow-spin" : ""}`}
                style={{
                  top: 0, left: 0, width: 264, height: 264,
                  borderRadius: "50%",
                  boxShadow: "0 0 48px rgba(245,158,11,0.22), 0 0 96px rgba(245,158,11,0.1)",
                }}
              />

            {/* Drehendes Rad */}
            <svg
              width="264" height="264"
              viewBox="0 0 300 300"
              className={animating ? "spin-transition" : undefined}
              style={{
                "--spin-ms": `${SPIN_MS}ms`,
                transform: `rotate(${deg}deg)`,
                transformOrigin: "center",
                willChange: animating ? "transform" : "auto",
                display: "block",
              } as React.CSSProperties}
            >
              <defs>
                <radialGradient id="hubGrad" cx="38%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="100%" stopColor="#92400e" />
                </radialGradient>
                {/* Weißer Schimmer pro Segment oben */}
                <radialGradient id="sheen" cx="50%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
              </defs>

              {/* Segmente */}
              {SEGMENTS.map((seg, i) => {
                const mid          = (i + 0.5) * SEG;
                const { x: tx, y: ty } = pt(R_TEXT, mid);
                return (
                  <g key={i}>
                    {/* Farbfläche */}
                    <path d={segPath(i)} fill={seg.fill} />
                    {/* Schimmer-Overlay */}
                    <path d={segPath(i)} fill="url(#sheen)" />
                    {/* Trennlinie */}
                    <line
                      x1={CX} y1={CY}
                      x2={pt(R, i * SEG).x} y2={pt(R, i * SEG).y}
                      stroke="rgba(0,0,0,0.45)" strokeWidth="1.5"
                    />
                    {/* Label */}
                    <g transform={`translate(${tx},${ty}) rotate(${mid})`}
                      style={{ userSelect: "none", pointerEvents: "none" }}>
                      <text
                        textAnchor="middle" y="-5"
                        fontSize="12" fontWeight="800"
                        fill={seg.text}
                        fontFamily="system-ui,-apple-system,sans-serif"
                      >{seg.line1}</text>
                      <text
                        textAnchor="middle" y="8"
                        fontSize="7.5" fontWeight="600"
                        fill={seg.text} opacity="0.85"
                        fontFamily="system-ui,-apple-system,sans-serif"
                      >{seg.line2}</text>
                    </g>
                  </g>
                );
              })}

              {/* Äußerer Rand */}
              <circle cx={CX} cy={CY} r={R + 1}
                fill="none" stroke="rgba(245,158,11,0.55)" strokeWidth="3.5" />
              <circle cx={CX} cy={CY} r={R - 1}
                fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="3" />

              {/* Nabe */}
              <circle cx={CX} cy={CY} r="27"
                fill="#0d0d0f" stroke="rgba(245,158,11,0.4)" strokeWidth="2.5" />
              <circle cx={CX} cy={CY} r="17" fill="url(#hubGrad)" />
              <circle cx={CX} cy={CY} r="7"
                fill="#0d0d0f" stroke="rgba(245,158,11,0.25)" strokeWidth="1" />
            </svg>
            </div>{/* Ende Clip-Container */}
          </div>{/* Ende äußerer Wrapper */}

          {/* Drehen-Button */}
          <button
            onClick={handleSpin}
            disabled={done || spinning}
            className={`w-full max-w-[220px] py-3 rounded-xl text-sm font-semibold transition-all ${
              done
                ? "bg-white/[0.04] text-gray-600 border border-white/[0.06] cursor-not-allowed"
                : spinning
                ? "bg-amber-700/60 text-amber-300 cursor-wait"
                : "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_24px_rgba(245,158,11,0.35)] hover:shadow-[0_0_32px_rgba(245,158,11,0.5)] active:scale-[0.97]"
            }`}
          >
            {done ? "✓ Bereits gedreht" : spinning ? "🎡 Dreht…" : "🎡 Drehen!"}
          </button>
        </div>
      </div>

      {/* Ergebnis-Footer */}
      {done && result && (
        <div className="result-pop border-t border-white/[0.04] px-5 py-2.5 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            Ergebnis: <span className="text-amber-400 font-medium">{result.prizeLabel}</span>
          </p>
          <p className="text-xs text-gray-600 shrink-0 tabular-nums">
            {countdown ? `Nächster Spin in ${countdown}` : ""}
          </p>
        </div>
      )}
    </div>
    </>
  );
}

"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import confetti from "canvas-confetti";

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
  { label: "200 Münzen ⭐", line1: "200",  line2: "Münzen ⭐", fill: "#b91c1c", fillB: "#7f1d1d", rim: "#fca5a5", text: "#fecaca" },
  { label: "10 Münzen",    line1: "10",   line2: "Münzen",    fill: "#1f2937", fillB: "#111827", rim: "#4b5563", text: "#9ca3af" },
  { label: "100 Münzen",   line1: "100",  line2: "Münzen",    fill: "#b45309", fillB: "#78350f", rim: "#fcd34d", text: "#fef08a" },
  { label: "Kein Glück",   line1: "Kein", line2: "Glück",     fill: "#0f172a", fillB: "#020617", rim: "#334155", text: "#475569" },
  { label: "200 Münzen",   line1: "200",  line2: "Münzen",    fill: "#c2410c", fillB: "#7c2d12", rim: "#fdba74", text: "#fed7aa" },
  { label: "25 Münzen",    line1: "25",   line2: "Münzen",    fill: "#1d4ed8", fillB: "#1e3a8a", rim: "#93c5fd", text: "#bfdbfe" },
  { label: "50 Münzen",    line1: "50",   line2: "Münzen",    fill: "#047857", fillB: "#064e3b", rim: "#6ee7b7", text: "#a7f3d0" },
];

const N   = SEGMENTS.length;
const SEG = 360 / N;
const CX = 150, CY = 150, R = 137, R_TEXT = 92, R_RIM = 140;

function pt(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}
function segPath(i: number) {
  const { x: sx, y: sy } = pt(R, i * SEG);
  const { x: ex, y: ey } = pt(R, (i + 1) * SEG);
  return `M${CX},${CY} L${sx},${sy} A${R},${R},0,0,1,${ex},${ey} Z`;
}
function rimPath(i: number) {
  const a0 = i * SEG, a1 = (i + 1) * SEG;
  const { x: s1x, y: s1y } = pt(R_RIM, a0);
  const { x: e1x, y: e1y } = pt(R_RIM, a1);
  const { x: s2x, y: s2y } = pt(R, a0);
  const { x: e2x, y: e2y } = pt(R, a1);
  return `M${s1x},${s1y} A${R_RIM},${R_RIM},0,0,1,${e1x},${e1y} L${e2x},${e2y} A${R},${R},0,0,0,${s2x},${s2y} Z`;
}

// Tick-Sound via Web Audio API (kurzer Klick-Sound)
let audioCtx: AudioContext | null = null;
function playTick() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch { /* AudioContext nicht verfügbar */ }
}

interface Props {
  alreadySpun:   boolean;
  lastResult:    { prizeLabel: string; prizeType: string } | null;
  initialPoints: number;
}

export default function DailySpin({ alreadySpun, lastResult, initialPoints }: Props) {
  const countdown = useMidnightCountdown();
  const router = useRouter();

  // Anfangsdrehung: letztes Ergebnis zentrieren falls vorhanden
  const initialDeg = React.useMemo(() => {
    if (!alreadySpun || !lastResult) return 0;
    const idx = SEGMENTS.findIndex(s => s.label === lastResult.prizeLabel);
    if (idx < 0) return 0;
    return (360 - (idx + 0.5) * SEG + 3600) % 360;
  }, [alreadySpun, lastResult]);

  const [spinning,  setSpinning]  = useState(false);
  const [done,      setDone]      = useState(alreadySpun);
  const [result,    setResult]    = useState(lastResult);
  const [points,    setPoints]    = useState(initialPoints);
  const [pointerDeg, setPointerDeg] = useState(0); // Zeiger-Ausschlag in Grad

  // Aktueller Rad-Winkel als Ref (live, kein Re-Render bei jedem Frame)
  const degRef   = useRef(initialDeg);
  const svgRef   = useRef<SVGSVGElement>(null);
  const rafRef   = useRef<number>(0);

  // Zeiger-Segment-Tracking
  const lastSegRef = useRef(-1);

  // Wende Rotation direkt auf SVG an (kein State-Re-Render pro Frame)
  const applyRotation = useCallback((d: number) => {
    if (svgRef.current) {
      svgRef.current.style.transform = `rotate(${d}deg)`;
    }
    degRef.current = d;
  }, []);

  // Beim ersten Render: Anfangsdrehung setzen
  useEffect(() => {
    if (initialDeg > 0) applyRotation(initialDeg);
  }, [initialDeg, applyRotation]);

  // Segment-Index bei aktuellem Winkel (welches Segment ist oben am Zeiger)
  function segAtAngle(d: number): number {
    const norm = ((360 - (d % 360)) + 360) % 360;
    return Math.floor(norm / SEG) % N;
  }

  async function handleSpin() {
    if (done || spinning) return;
    setSpinning(true);

    try {
      const res  = await fetch("/api/shop/spin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); setSpinning(false); return; }

      const segIdx      = SEGMENTS.findIndex(s => s.label === data.prize.label);
      const targetAngle = (segIdx + 0.5) * SEG;
      const targetDeg   = (360 - targetAngle + 3600) % 360;
      const currentNorm = degRef.current % 360;
      const delta       = (targetDeg - currentNorm + 360) % 360;
      const totalSpin   = (delta === 0 ? 360 : delta) + 360 * 8; // mind. 8 Runden
      const startDeg    = degRef.current;
      const finalDeg    = startDeg + totalSpin;

      // Physikalische Abbremsung: ease-out mit Cubic (quadratische Abbremsung)
      const duration = 6500; // ms
      const startTime = performance.now();
      lastSegRef.current = segAtAngle(startDeg);

      function frame(now: number) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Ease-out cubic: schnell starten, weich abbremsen mit leichtem Bounce
        const ease = t < 1
          ? 1 - Math.pow(1 - t, 3)
          : 1;

        const currentDeg = startDeg + totalSpin * ease;
        applyRotation(currentDeg);

        // Tick-Effekt: jedes Mal wenn Segmentgrenze überschritten
        const curSeg = segAtAngle(currentDeg);
        if (curSeg !== lastSegRef.current) {
          lastSegRef.current = curSeg;
          // Zeiger-Ausschlag abhängig von Drehgeschwindigkeit
          const speed = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
          const kickDeg = -12 * speed - 3;
          setPointerDeg(kickDeg);
          setTimeout(() => setPointerDeg(0), 80 + speed * 60);
          playTick();
          // Haptik auf Mobile
          if (navigator.vibrate) navigator.vibrate(speed > 0.3 ? 8 : 4);
        }

        if (t < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          applyRotation(finalDeg);
          setPointerDeg(-6);
          setTimeout(() => { setPointerDeg(3); setTimeout(() => setPointerDeg(0), 60); }, 80);

          setResult({ prizeLabel: data.prize.label, prizeType: data.prize.type });
          setDone(true);

          if (data.prize.type === "points") {
            const won = parseInt(data.prize.value ?? "0", 10);
            if (won > 0) setPoints(p => p + won);
            toast.success(`🎰 ${data.prize.label} gewonnen!`);
            confetti({
              particleCount: 140,
              spread: 75,
              origin: { y: 0.55 },
              colors: ["#f59e0b", "#fcd34d", "#fef08a", "#ffffff", "#fb923c"],
            });
          } else {
            toast("🎰 Heute kein Glück — morgen wieder!", { description: "Drehe morgen erneut." });
          }

          router.refresh();
          setSpinning(false);
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    } catch {
      toast.error("Netzwerkfehler");
      setSpinning(false);
    }
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <>
      <style>{`
        @keyframes resultPop {
          0%   { transform: scale(0.88); opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
        .result-pop { animation: resultPop 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
        .glow-pulse { animation: glowPulse 0.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .result-pop, .glow-pulse { animation: none !important; }
        }
      `}</style>

      <div className="glass card-shine rounded-2xl border border-amber-500/15 overflow-hidden">
        <div className="p-5 space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-xl">🎡</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Täglicher Gratis-Spin</p>
              <p className="text-xs text-gray-500">Einmal täglich drehen — gewinne bis zu 200 Münzen!</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <span className="text-sm">🪙</span>
              <span className="text-sm font-bold text-amber-400 tabular-nums">{points.toLocaleString("de-DE")}</span>
            </div>
          </div>

          {/* Glücksrad */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative" style={{ width: 272 }}>

              {/* Glow-Ring außen */}
              <div
                className={spinning ? "glow-pulse" : undefined}
                style={{
                  position: "absolute", inset: 4,
                  borderRadius: "50%",
                  pointerEvents: "none",
                  boxShadow: spinning
                    ? "0 0 40px rgba(245,158,11,0.45), 0 0 80px rgba(245,158,11,0.18)"
                    : "0 0 24px rgba(245,158,11,0.15)",
                  transition: "box-shadow 0.6s ease",
                }}
              />

              {/* Zeiger */}
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  top: 0, left: "50%",
                  transform: `translateX(-50%)`,
                  transformOrigin: "50% 100%",
                }}
              >
                <svg
                  width="26" height="36" viewBox="0 0 26 36"
                  style={{
                    transform: `rotate(${pointerDeg}deg)`,
                    transformOrigin: "50% 100%",
                    transition: pointerDeg === 0 ? "transform 0.12s cubic-bezier(0.34,1.56,0.64,1)" : "none",
                    filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.85))",
                  }}
                >
                  {/* Zeiger-Körper */}
                  <polygon points="13,34 2,6 24,6" fill="#f59e0b" />
                  {/* Glanzstreifen */}
                  <polygon points="13,34 6,6 13,6" fill="rgba(255,255,255,0.22)" />
                  {/* Dunkle Kante */}
                  <polygon points="13,34 2,6 24,6" fill="none" stroke="#78350f" strokeWidth="1.2" />
                  {/* Niete oben */}
                  <circle cx="13" cy="7" r="3.5" fill="#fcd34d" stroke="#92400e" strokeWidth="1" />
                </svg>
              </div>

              {/* Rad-Container: nur obere Hälfte sichtbar */}
              <div style={{ width: 272, height: 140, overflow: "hidden", position: "relative" }}>
                <svg
                  ref={svgRef}
                  width="272" height="272"
                  viewBox="0 0 300 300"
                  style={{
                    transform: `rotate(${degRef.current}deg)`,
                    transformOrigin: "center",
                    willChange: "transform",
                    display: "block",
                  }}
                >
                  <defs>
                    {/* Gradienten pro Segment */}
                    {SEGMENTS.map((seg, i) => (
                      <radialGradient key={i} id={`sg${i}`} cx="35%" cy="30%" r="80%">
                        <stop offset="0%" stopColor={seg.fill} />
                        <stop offset="100%" stopColor={seg.fillB} />
                      </radialGradient>
                    ))}
                    {/* Weißer Schimmer */}
                    <radialGradient id="sheen" cx="50%" cy="10%" r="90%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                      <stop offset="60%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                    {/* Naben-Gradient */}
                    <radialGradient id="hubGrad" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#fcd34d" />
                      <stop offset="100%" stopColor="#92400e" />
                    </radialGradient>
                    {/* Innenschatten für Tiefe */}
                    <radialGradient id="innerShadow" cx="50%" cy="50%" r="50%">
                      <stop offset="70%" stopColor="rgba(0,0,0,0)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
                    </radialGradient>
                  </defs>

                  {/* Segmente */}
                  {SEGMENTS.map((seg, i) => {
                    const mid = (i + 0.5) * SEG;
                    const { x: tx, y: ty } = pt(R_TEXT, mid);
                    return (
                      <g key={i}>
                        {/* Hauptfläche mit Radial-Gradient */}
                        <path d={segPath(i)} fill={`url(#sg${i})`} />
                        {/* Schimmer-Overlay */}
                        <path d={segPath(i)} fill="url(#sheen)" />
                        {/* Farbiger Rand-Streifen */}
                        <path d={rimPath(i)} fill={seg.rim} opacity="0.55" />
                        {/* Trennlinie */}
                        <line
                          x1={CX} y1={CY}
                          x2={pt(R_RIM, i * SEG).x} y2={pt(R_RIM, i * SEG).y}
                          stroke="rgba(0,0,0,0.6)" strokeWidth="2"
                        />
                        {/* Label */}
                        <g
                          transform={`translate(${tx},${ty}) rotate(${mid})`}
                          style={{ userSelect: "none", pointerEvents: "none" }}
                        >
                          <text
                            textAnchor="middle" y="-5"
                            fontSize="13" fontWeight="800"
                            fill={seg.text}
                            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                            fontFamily="system-ui,-apple-system,sans-serif"
                          >{seg.line1}</text>
                          <text
                            textAnchor="middle" y="9"
                            fontSize="7.5" fontWeight="600"
                            fill={seg.text} opacity="0.82"
                            fontFamily="system-ui,-apple-system,sans-serif"
                          >{seg.line2}</text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Innenschatten für 3D-Tiefe */}
                  <circle cx={CX} cy={CY} r={R} fill="url(#innerShadow)" />

                  {/* Äußerer Goldrand (dreifach für Tiefe) */}
                  <circle cx={CX} cy={CY} r={R_RIM + 1}
                    fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="3.5" />
                  <circle cx={CX} cy={CY} r={R_RIM + 0.5}
                    fill="none" stroke="rgba(245,158,11,0.9)" strokeWidth="2" />
                  <circle cx={CX} cy={CY} r={R_RIM - 1.5}
                    fill="none" stroke="rgba(253,211,77,0.35)" strokeWidth="1.5" />

                  {/* Naben-Ring */}
                  <circle cx={CX} cy={CY} r="30"
                    fill="#0a0a0c" stroke="rgba(245,158,11,0.5)" strokeWidth="3" />
                  <circle cx={CX} cy={CY} r="19" fill="url(#hubGrad)" />
                  {/* Nabenglanz */}
                  <circle cx={CX} cy={CY} r="19"
                    fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <circle cx={CX - 4} cy={CY - 4} r="5"
                    fill="rgba(255,255,255,0.25)" />
                  {/* Innere Schraube */}
                  <circle cx={CX} cy={CY} r="7"
                    fill="#0a0a0c" stroke="rgba(245,158,11,0.3)" strokeWidth="1" />
                </svg>
              </div>
            </div>

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

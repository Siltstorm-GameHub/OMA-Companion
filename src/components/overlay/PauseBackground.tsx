"use client";

import type { CSSProperties, ReactNode } from "react";
import { getPauseBackground } from "./pauseBackgrounds";

/**
 * Hintergrund der Pausen-Szene: Bild (bzw. Farbfläche) plus — außer im Leicht-Modus — eine auf das
 * Motiv abgestimmte Effekt-Ebene, die das Bild "lebendig" macht (langsamer Kamera-Zoom, Sterne,
 * Regen, Scheinwerfer, Nebel …).
 *
 * Alle Effekte animieren ausschließlich transform und opacity — das läuft im Compositor der
 * Grafikkarte und kostet in der OBS-Browserquelle kaum etwas. Keine filter/blur-Animationen;
 * weiche Formen entstehen über radiale Verläufe. Zufällige Positionen kommen aus einem festen
 * Seed, damit Server- und Client-Render identisch sind.
 */
export default function PauseBackground({ backgroundKey, lite }: { backgroundKey: string; lite: boolean }) {
  const bg = getPauseBackground(backgroundKey);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {!lite && <EffectStyles />}
      {bg.image && (
        <div
          className={lite ? undefined : "oma-pb-kenburns"}
          style={{ position: "absolute", inset: 0, backgroundImage: `url(${bg.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      )}
      {!lite && <SceneEffects sceneKey={bg.key} />}
      <div style={{ position: "absolute", inset: 0, background: bg.overlay }} />
    </div>
  );
}

// ── Szenen ────────────────────────────────────────────────────────────────────
// Koordinaten in Prozent von 1920×1080, passend zu den Motiven in public/overlay/pause/.

function SceneEffects({ sceneKey }: { sceneKey: string }) {
  switch (sceneKey) {
    case "synthwave":
      return (
        <>
          <Twinkle seed={1} count={45} area={[0, 0, 100, 45]} />
          <Glow x={50} y={72} size={34} color="255,120,160" anim="pulse" duration={6} />
          <Scan top={84} />
        </>
      );
    case "pixel":
      return (
        <>
          <Twinkle seed={2} count={40} area={[0, 0, 100, 45]} pixel />
          <Glow x={18} y={24} size={14} color="255,236,170" anim="pulse" duration={7} />
          <Drift top={18} height={14} opacity={0.18} duration={90} color="140,140,220" />
          <Shimmer x={25} y={80} w={10} h={10} />
          <Shimmer x={60} y={80} w={10} h={6} delay={1.5} />
        </>
      );
    case "neoncity":
      return (
        <>
          <Glow x={9} y={42} size={18} color="255,60,190" anim="flicker" duration={5} />
          <Glow x={89} y={38} size={16} color="255,60,190" anim="flicker" duration={7} delay={2} />
          <Glow x={70} y={50} size={20} color="45,212,191" anim="pulse" duration={8} />
          <Rain opacity={0.32} />
        </>
      );
    case "esports":
      return (
        <>
          <Beam x={4} y={-4} color="45,212,191" from={-28} to={8} duration={9} />
          <Beam x={14} y={-4} color="45,212,191" from={-12} to={22} duration={11} delay={1.5} />
          <Beam x={86} y={-4} color="248,113,113" from={28} to={-8} duration={10} delay={0.7} />
          <Beam x={96} y={-4} color="248,113,113" from={12} to={-22} duration={12} delay={2.2} />
          <Drift top={58} height={30} opacity={0.22} duration={60} color="160,200,210" />
        </>
      );
    case "cozy":
      return (
        <>
          <Glow x={21} y={53} size={22} color="255,200,120" anim="flicker" duration={9} />
          <Glow x={93} y={55} size={14} color="255,190,140" anim="pulse" duration={6} />
          <Bokeh seed={5} count={22} />
          <Twinkle seed={51} count={14} area={[20, 5, 32, 60]} color="255,214,140" size={5} />
          <Twinkle seed={52} count={14} area={[78, 5, 84, 90]} color="255,214,140" size={5} />
        </>
      );
    case "mountains":
      return (
        <>
          <Twinkle seed={6} count={40} area={[0, 0, 100, 25]} />
          <Drift top={42} height={18} opacity={0.22} duration={80} color="230,200,215" />
          <Drift top={56} height={14} opacity={0.16} duration={110} color="230,200,215" reverse />
          <Shimmer x={35} y={64} w={30} h={10} />
        </>
      );
    case "space":
      return (
        <>
          <Twinkle seed={7} count={70} area={[0, 0, 100, 100]} />
          <Glow x={16} y={20} size={16} color="255,240,220" anim="pulse" duration={8} />
          <Glow x={10} y={55} size={36} color="200,40,90" anim="breathe" duration={14} />
          <Glow x={75} y={35} size={32} color="45,212,191" anim="breathe" duration={17} delay={3} />
          <ShootingStar />
        </>
      );
    case "racing":
      return (
        <>
          <Trails />
          <Glow x={13} y={20} size={10} color="235,245,255" anim="flicker" duration={6} />
          <Glow x={90} y={39} size={9} color="235,245,255" anim="pulse" duration={5} />
          <Rain opacity={0.22} />
        </>
      );
    default:
      return null;
  }
}

// ── Bausteine ─────────────────────────────────────────────────────────────────

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const layer: CSSProperties = { position: "absolute", pointerEvents: "none" };

/** Funkelnde Lichtpunkte (Sterne, Lichterkette) in einem Bereich [x0, y0, x1, y1] in Prozent. */
function Twinkle({ seed, count, area, color = "255,255,255", size = 3, pixel = false }: {
  seed: number; count: number; area: [number, number, number, number]; color?: string; size?: number; pixel?: boolean;
}) {
  const rand = rng(seed);
  const items: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const s = size * (0.5 + rand());
    items.push(
      <span
        key={i}
        className="oma-pb-twinkle"
        style={{
          ...layer,
          left: `${area[0] + rand() * (area[2] - area[0])}%`,
          top: `${area[1] + rand() * (area[3] - area[1])}%`,
          width: s, height: s,
          borderRadius: pixel ? 0 : "50%",
          background: pixel ? `rgb(${color})` : `radial-gradient(circle, rgba(${color},1) 0%, rgba(${color},0) 70%)`,
          animationDuration: `${2 + rand() * 4}s`,
          animationDelay: `${-rand() * 6}s`,
        }}
      />,
    );
  }
  return <>{items}</>;
}

/** Weicher Lichtschein, der pulsiert, flackert (Neon/Lampe) oder langsam "atmet" (Nebel im All). */
function Glow({ x, y, size, color, anim, duration, delay = 0 }: {
  x: number; y: number; size: number; color: string; anim: "pulse" | "flicker" | "breathe"; duration: number; delay?: number;
}) {
  return (
    <span
      className={`oma-pb-${anim}`}
      style={{
        ...layer,
        // Größe in Prozent der Bühnenbreite (1920px), unabhängig vom Browserfenster.
        left: `${x}%`, top: `${y}%`, width: size * 19.2, height: size * 19.2,
        marginLeft: -size * 9.6, marginTop: -size * 9.6,
        background: `radial-gradient(circle, rgba(${color},0.55) 0%, rgba(${color},0.18) 35%, rgba(${color},0) 70%)`,
        animationDuration: `${duration}s`, animationDelay: `${delay}s`,
        mixBlendMode: "screen",
      }}
    />
  );
}

/** Regen: zwei versetzte Ebenen mit Streifen, die nach unten laufen (nahtlos per translateY). */
function Rain({ opacity }: { opacity: number }) {
  const streaks = "repeating-linear-gradient(100deg, rgba(200,230,255,0) 0px, rgba(200,230,255,0) 22px, rgba(200,230,255,0.55) 23px, rgba(200,230,255,0) 24px)";
  const sheet = (duration: number, offset: number, scale: number): CSSProperties => ({
    ...layer, left: "-10%", top: "-100%", width: "120%", height: "200%",
    backgroundImage: streaks, backgroundSize: `${90 * scale}px ${140 * scale}px`,
    opacity, animationDuration: `${duration}s`, animationDelay: `${offset}s`,
  });
  return (
    <>
      <span className="oma-pb-rain" style={sheet(0.9, 0, 1)} />
      <span className="oma-pb-rain" style={{ ...sheet(1.4, -0.5, 0.7), opacity: opacity * 0.6 }} />
    </>
  );
}

/** Schwenkender Scheinwerferkegel, Drehpunkt oben an (x, y). */
function Beam({ x, y, color, from, to, duration, delay = 0 }: { x: number; y: number; color: string; from: number; to: number; duration: number; delay?: number }) {
  return (
    <span
      className="oma-pb-beam"
      style={{
        ...layer, left: `${x}%`, top: `${y}%`, width: 260, height: "110%", marginLeft: -130,
        transformOrigin: "50% 0%",
        background: `linear-gradient(180deg, rgba(${color},0.5) 0%, rgba(${color},0.12) 55%, rgba(${color},0) 100%)`,
        clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
        mixBlendMode: "screen",
        // Schwenkbereich als CSS-Variablen, die Keyframes lesen sie.
        ["--from" as string]: `${from}deg`, ["--to" as string]: `${to}deg`,
        animationDuration: `${duration}s`, animationDelay: `${delay}s`,
      }}
    />
  );
}

/** Nebel-/Dunstband, das langsam seitwärts zieht (doppelt breit, nahtlos). */
function Drift({ top, height, opacity, duration, color, reverse = false }: { top: number; height: number; opacity: number; duration: number; color: string; reverse?: boolean }) {
  const puff = `radial-gradient(ellipse 18% 60% at 25% 50%, rgba(${color},0.9), rgba(${color},0) 70%), radial-gradient(ellipse 22% 50% at 70% 55%, rgba(${color},0.7), rgba(${color},0) 70%)`;
  return (
    <span
      className="oma-pb-drift"
      style={{
        ...layer, left: 0, top: `${top}%`, width: "200%", height: `${height}%`,
        backgroundImage: puff, backgroundSize: "50% 100%", backgroundRepeat: "repeat-x",
        opacity, animationDuration: `${duration}s`, animationDirection: reverse ? "reverse" : "normal",
      }}
    />
  );
}

/** Glitzern auf einer Wasserfläche: kurze helle Linien, die versetzt aufblitzen. */
function Shimmer({ x, y, w, h, delay = 0 }: { x: number; y: number; w: number; h: number; delay?: number }) {
  const rand = rng(Math.round(x * 100 + y));
  const lines: ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    lines.push(
      <span
        key={i}
        className="oma-pb-twinkle"
        style={{
          ...layer,
          left: `${x + rand() * w}%`, top: `${y + rand() * h}%`,
          width: 20 + rand() * 50, height: 2,
          background: "linear-gradient(90deg, rgba(255,240,220,0), rgba(255,240,220,0.8), rgba(255,240,220,0))",
          animationDuration: `${1.5 + rand() * 2.5}s`, animationDelay: `${delay - rand() * 4}s`,
        }}
      />,
    );
  }
  return <>{lines}</>;
}

/** Lichtband, das langsam über die Gitter-Ebene (Synthwave) nach vorn läuft. */
function Scan({ top }: { top: number }) {
  return (
    <span
      className="oma-pb-scan"
      style={{
        ...layer, left: 0, right: 0, top: `${top}%`, height: 6,
        background: "linear-gradient(90deg, rgba(255,90,180,0), rgba(255,140,200,0.7), rgba(255,90,180,0))",
        mixBlendMode: "screen",
      }}
    />
  );
}

/** Schwebende, unscharfe Lichtpunkte (Bokeh), die langsam aufsteigen. */
function Bokeh({ seed, count }: { seed: number; count: number }) {
  const rand = rng(seed);
  const colors = ["255,200,120", "255,170,110", "255,225,170", "250,160,190"];
  const items: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const size = 30 + rand() * 90;
    const c = colors[Math.floor(rand() * colors.length)];
    items.push(
      <span
        key={i}
        className="oma-pb-float"
        style={{
          ...layer, left: `${rand() * 100}%`, top: `${10 + rand() * 90}%`, width: size, height: size, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(${c},0.35) 0%, rgba(${c},0.12) 55%, rgba(${c},0) 72%)`,
          animationDuration: `${18 + rand() * 22}s`, animationDelay: `${-rand() * 40}s`,
        }}
      />,
    );
  }
  return <>{items}</>;
}

/** Gelegentliche Sternschnuppe (einmal pro Zyklus, sonst unsichtbar). */
function ShootingStar() {
  return (
    <span
      className="oma-pb-shoot"
      style={{
        ...layer, left: "62%", top: "8%", width: 220, height: 2,
        background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95))",
        transform: "rotate(160deg)",
      }}
    />
  );
}

/** Rote/weiße Lichtspuren vorbeirauschender Autos auf Höhe der Strecke. */
function Trails() {
  const trail = (top: number, color: string, duration: number, delay: number, width: number): ReactNode => (
    <span
      key={`${top}-${delay}`}
      className="oma-pb-trail"
      style={{
        ...layer, left: 0, top: `${top}%`, width, height: 4, borderRadius: 4,
        background: `linear-gradient(90deg, rgba(${color},0), rgba(${color},0.9))`,
        mixBlendMode: "screen",
        animationDuration: `${duration}s`, animationDelay: `${delay}s`,
      }}
    />
  );
  return <>{[trail(58, "255,60,60", 2.6, 0, 520), trail(61, "255,90,70", 3.4, 1.1, 380), trail(64, "255,230,210", 4.2, 2.3, 300), trail(56, "255,60,60", 3.0, 3.4, 460)]}</>;
}

/** Keyframes aller Effekte — nur transform/opacity. Wird im Leicht-Modus gar nicht gerendert. */
function EffectStyles() {
  return (
    <style>{`
      @keyframes oma-pb-kenburns { 0% { transform: scale(1.02) translate(0, 0); } 100% { transform: scale(1.1) translate(-1.5%, -1%); } }
      @keyframes oma-pb-twinkle  { 0%, 100% { opacity: 0.15; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1); } }
      @keyframes oma-pb-pulse    { 0%, 100% { opacity: 0.55; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
      @keyframes oma-pb-breathe  { 0%, 100% { opacity: 0.25; transform: scale(0.9); } 50% { opacity: 0.7; transform: scale(1.1); } }
      @keyframes oma-pb-flicker  { 0%, 100% { opacity: 0.9; } 8% { opacity: 0.4; } 10% { opacity: 0.95; } 12% { opacity: 0.5; } 14% { opacity: 1; } 60% { opacity: 0.8; } 62% { opacity: 0.45; } 64% { opacity: 0.9; } }
      @keyframes oma-pb-rain     { from { transform: translateY(0); } to { transform: translateY(50%); } }
      @keyframes oma-pb-beam     { 0%, 100% { transform: rotate(var(--from)); } 50% { transform: rotate(var(--to)); } }
      @keyframes oma-pb-drift    { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @keyframes oma-pb-scan     { 0% { transform: translateY(0) scaleX(0.4); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(160px) scaleX(1.4); opacity: 0; } }
      @keyframes oma-pb-float    { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(-260px); opacity: 0; } }
      @keyframes oma-pb-shoot    { 0%, 88% { opacity: 0; transform: rotate(160deg) translateX(0); } 90% { opacity: 1; } 96% { opacity: 0; transform: rotate(160deg) translateX(700px); } 100% { opacity: 0; transform: rotate(160deg) translateX(700px); } }
      @keyframes oma-pb-trail    { 0% { transform: translateX(-600px); opacity: 0; } 10% { opacity: 1; } 70% { opacity: 1; } 100% { transform: translateX(2200px); opacity: 0; } }
      .oma-pb-kenburns { animation: oma-pb-kenburns 45s ease-in-out infinite alternate; will-change: transform; }
      .oma-pb-twinkle  { animation: oma-pb-twinkle ease-in-out infinite; }
      .oma-pb-pulse    { animation: oma-pb-pulse ease-in-out infinite; }
      .oma-pb-breathe  { animation: oma-pb-breathe ease-in-out infinite; }
      .oma-pb-flicker  { animation: oma-pb-flicker linear infinite; }
      .oma-pb-rain     { animation: oma-pb-rain linear infinite; will-change: transform; }
      .oma-pb-beam     { animation: oma-pb-beam ease-in-out infinite; }
      .oma-pb-drift    { animation: oma-pb-drift linear infinite; will-change: transform; }
      .oma-pb-scan     { animation: oma-pb-scan 4s ease-in infinite; }
      .oma-pb-float    { animation: oma-pb-float linear infinite; }
      .oma-pb-shoot    { animation: oma-pb-shoot 11s ease-out infinite; }
      .oma-pb-trail    { animation: oma-pb-trail cubic-bezier(0.5, 0, 0.8, 1) infinite; }
      @media (prefers-reduced-motion: reduce) {
        [class^="oma-pb-"] { animation: none !important; }
      }
    `}</style>
  );
}

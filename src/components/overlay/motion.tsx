"use client";

/**
 * Positionierung, Bewegung und Rotation der Overlay-Kacheln — gemeinsam für alle Overlay-Arten.
 */
import { useEffect, useRef, useState } from "react";
import { EDGE_MARGIN, PANEL_FADE_MS, CYCLE_FADE_MS, type ElementCycle } from "./types";

export type PanelPhase = "enter" | "settled" | "leave";

/** Absolute Positionierung aus einer frei gezogenen Layout-Koordinate (Prozent von 1920×1080).
 *  Fehlt die Koordinate (Element aktiviert, aber noch nie positioniert), fällt es auf die
 *  Standard-Ecke oben rechts zurück statt unsichtbar zu bleiben. */
export function elementPositionStyle(pos: { x: number; y: number } | undefined): React.CSSProperties {
  if (!pos) return { position: "absolute", top: EDGE_MARGIN, right: EDGE_MARGIN };
  return { position: "absolute", left: `${pos.x}%`, top: `${pos.y}%` };
}

/** Opacity/Blur/Versatz für eine Rotations-Phase: "enter" kommt leicht von unten verschwommen
 *  herein, "leave" wandert nach oben weiter und verschwimmt wieder — zusammen eine klare
 *  Bewegungsrichtung statt eines reinen Stand-Fades. */
export function panelMotionStyle(phase: PanelPhase): React.CSSProperties {
  if (phase === "settled") {
    return { opacity: 1, filter: "blur(0px)", transform: "translateY(0) scale(1)" };
  }
  const offset = phase === "enter" ? 40 : -40;
  return { opacity: 0, filter: "blur(16px)", transform: `translateY(${offset}px) scale(0.9)` };
}

/** Kombiniert die Kachel-Eigenskalierung (Größe, per Einstellungen frei wählbar) mit dem
 *  Crossfade der Stapel-Rotation (`panelMotionStyle`) und dem Sichtbarkeits-Zyklus
 *  (`useVisibilityCycles`) zu EINEM Style-Objekt für die jeweils innerste Kachel-Hülle.
 *  Skalierung per CSS-Transform statt fester Pixelgrößen, damit der komplette Kachelinhalt
 *  (Schrift, Avatare, Abstände) automatisch proportional mitwächst/-schrumpft. */
export function combinedElementStyle(motion: React.CSSProperties, scale: number | undefined, cycleVisible: boolean): React.CSSProperties {
  const s = scale ?? 1;
  const cycleScale = cycleVisible ? 1 : 0.92;
  const motionTransform = typeof motion.transform === "string" ? motion.transform : "";
  const motionOpacity = typeof motion.opacity === "number" ? motion.opacity : 1;
  return {
    ...motion,
    transform: `${motionTransform} scale(${s * cycleScale})`.trim(),
    transformOrigin: "top left",
    opacity: motionOpacity * (cycleVisible ? 1 : 0),
    filter: cycleVisible ? motion.filter : "blur(14px)",
    transition: `${motion.transition ? `${motion.transition}, ` : ""}opacity ${CYCLE_FADE_MS}ms ease, filter ${CYCLE_FADE_MS}ms ease, transform ${CYCLE_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
    pointerEvents: cycleVisible ? undefined : "none",
  };
}

/** Ob-sichtbar-Zustand je Element mit konfiguriertem Sichtbarkeits-Zyklus — EIN Hook für alle
 *  Elemente (React verbietet Hooks in einer Schleife mit wechselnder Anzahl, siehe
 *  useStackedElements weiter unten für dasselbe Muster), verwaltet intern einen Timer je
 *  Element. Elemente ohne `cycle`-Konfiguration gelten immer als sichtbar. */
export function useVisibilityCycles<K extends string>(cycles: Partial<Record<K, ElementCycle>>): Record<K, boolean> {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const sig = Object.entries(cycles).map(([k, c]) => `${k}:${(c as ElementCycle).onSec}-${(c as ElementCycle).offSec}`).sort().join("|");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const [key, cfg] of Object.entries(cycles) as [string, ElementCycle][]) {
      const onMs = Math.max(2, cfg.onSec) * 1000;
      const offMs = Math.max(2, cfg.offSec) * 1000;
      let isOn = true;
      const tick = () => {
        isOn = !isOn;
        setVisible(v => ({ ...v, [key]: isOn }));
        timers.push(setTimeout(tick, isOn ? onMs : offMs));
      };
      timers.push(setTimeout(tick, onMs));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return visible as Record<K, boolean>;
}

/** Einmal eingebettete Keyframes für alle Bewegungs-Akzente im Overlay: Live-Puls, Score-Pop
 *  bei Änderung, Sieger-Glow, Kachel-Entrance bei neuem Match, sanftes Atmen der Ränder. */
export function MotionStyles() {
  return (
    <style>{`
      @keyframes oma-pulse    { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes oma-pop      { 0% { transform: scale(0.6); opacity: 0; } 65% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes oma-flare    { 0% { box-shadow: 0 0 0 0 rgba(45,212,191,0); } 25% { box-shadow: 0 0 28px 6px rgba(45,212,191,0.55); } 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0); } }
      @keyframes oma-slidein  { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes oma-breathe  { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
      @keyframes oma-live-ring { 0% { transform: scale(1); opacity: 0.75; } 100% { transform: scale(2.8); opacity: 0; } }
      @keyframes oma-zoom-in  { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      @keyframes oma-zoom-out { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.96); } }
      .oma-anim-zoomin  { animation: oma-zoom-in 550ms cubic-bezier(0.16,1,0.3,1); }
      .oma-anim-zoomout { animation: oma-zoom-out 500ms cubic-bezier(0.4,0,1,1) both; }
      .oma-anim-pop     { animation: oma-pop 420ms cubic-bezier(0.16,1,0.3,1) both; }
      .oma-anim-flare   { animation: oma-flare 1100ms ease-out; }
      .oma-anim-slidein { animation: oma-slidein 480ms cubic-bezier(0.16,1,0.3,1) both; }
      .oma-anim-breathe { animation: oma-breathe 3.2s ease-in-out infinite; }
      .oma-live-ring    { animation: oma-live-ring 1.3s cubic-bezier(0,0,0.2,1) infinite; }
      /* Leicht-Modus für schwächere PCs: Glas-/Unschärfe-Effekte sind in der OBS-Browserquelle
         mit Abstand am teuersten (jede Kachel rechnet den Hintergrund jedes Frames neu), dazu
         Dauer-Animationen wie Atmen, Live-Ring und rotierende Rang-Ringe. Ein- und Ausblenden
         bleibt erhalten, nur ohne Unschärfe. */
      .oma-lite, .oma-lite * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
      .oma-lite * { filter: none !important; }
      .oma-lite .oma-anim-breathe, .oma-lite .oma-live-ring, .oma-lite .rr-ring-layer::before, .oma-lite .rr-apex { animation: none !important; }
      @media (prefers-reduced-motion: reduce) {
        .oma-anim-pop, .oma-anim-flare, .oma-anim-slidein, .oma-anim-breathe, .oma-live-ring, .oma-anim-zoomin, .oma-anim-zoomout { animation: none !important; }
      }
    `}</style>
  );
}

export type ElementSlot<K extends string> = { key: K; phase: PanelPhase };
export type StackBuckets<K extends string> = Record<string, { pos: { x: number; y: number }; keys: K[] }>;

/** Rotation als Crossfade für eine zur Laufzeit variable Anzahl gleichzeitiger Stapel (ein
 *  Stapel pro eindeutiger Layout-Position): die neue Kachel blendet ein, während die alte noch
 *  ausblendet ("previous") — kein Zeitpunkt, an dem beide unsichtbar sind. React verbietet,
 *  Hooks in einer Schleife mit wechselnder Anzahl aufzurufen, daher EIN Hook, der intern eine
 *  Map von Position auf Rotations-Zustand führt. Beide Seiten starten aus ihrem Zielzustand und
 *  flippen einen Tick später (setTimeout 30ms, der Browser braucht einen Paint dazwischen, sonst
 *  überspringt er die CSS-Transition) gleichzeitig in ihre Endposition. */
export function useStackedElements<K extends string>(buckets: StackBuckets<K>, rotateSeconds: number) {
  const [active, setActive] = useState<Record<string, ElementSlot<K>>>({});
  const [previous, setPrevious] = useState<Record<string, ElementSlot<K> | null>>({});

  // Stapel haben sich geändert — Zustand während des Renders neu aufsetzen statt in einem Effect
  // (react.dev "Adjusting state on prop change"). Startwert "" statt bucketsSig, damit auch ein
  // bereits beim ersten Render vorhandener Stapel (Startzustand vom Server) sofort initialisiert wird.
  const bucketsSig = Object.entries(buckets).map(([pos, b]) => `${pos}=${b.keys.join(",")}`).sort().join("|");
  const [prevSig, setPrevSig] = useState("");
  if (bucketsSig !== prevSig) {
    setPrevSig(bucketsSig);
    const initActive: Record<string, ElementSlot<K>> = {};
    for (const [pos, b] of Object.entries(buckets)) {
      if (b.keys.length) initActive[pos] = { key: b.keys[0], phase: "settled" };
    }
    setActive(initActive);
    setPrevious({});
  }

  useEffect(() => {
    const showMs = Math.max(4, rotateSeconds) * 1000;
    const intervals: ReturnType<typeof setInterval>[] = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    for (const [pos, b] of Object.entries(buckets)) {
      if (b.keys.length <= 1) continue;
      const items = b.keys;
      intervals.push(setInterval(() => {
        setActive(curr => {
          const currSlot = curr[pos];
          if (currSlot) setPrevious(p => ({ ...p, [pos]: { key: currSlot.key, phase: "settled" } }));
          const currIdx = currSlot ? items.indexOf(currSlot.key) : -1;
          const nextIdx = (currIdx + 1) % items.length;
          return { ...curr, [pos]: { key: items[nextIdx], phase: "enter" } };
        });

        timeouts.push(setTimeout(() => {
          setPrevious(p => (p[pos] ? { ...p, [pos]: { key: p[pos]!.key, phase: "leave" } } : p));
          setActive(a => (a[pos] ? { ...a, [pos]: { key: a[pos].key, phase: "settled" } } : a));
        }, 30));

        timeouts.push(setTimeout(() => {
          setPrevious(p => ({ ...p, [pos]: null }));
        }, 30 + PANEL_FADE_MS));
      }, showMs));
    }

    return () => {
      intervals.forEach(clearInterval);
      timeouts.forEach(clearTimeout);
    };
    // `buckets` bewusst nicht in den Deps: jeder Render erzeugt ein neues Objekt mit gleichem
    // Inhalt, das würde die Rotation ständig neu starten. bucketsSig fängt echte Änderungen ab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketsSig, rotateSeconds]);

  return { active, previous };
}

/**
 * Index für Kacheln, die intern durch mehrere Einträge rotieren (nächste Events, Community-Kachel).
 * Zwei Modi, je nachdem ob für die Kachel ein Sichtbarkeits-Zyklus (`hasCycle`) gesetzt ist:
 * - Ohne Zyklus: freilaufender Timer im `rotateSeconds`-Takt wie die übrigen Overlay-Elemente.
 * - Mit Zyklus: bei jedem Off→On-Wechsel genau einen weiter — ein freilaufender Timer würde auch
 *   während der unsichtbaren Phase weiterzählen und je nach Fensterlänge Einträge überspringen.
 * `itemsKey` ändert sich, wenn die Einträge wechseln → von vorn beginnen. `fadeIn` steuert einen
 * kurzen Ausblend-/Einblend-Übergang beim Weiterschalten.
 */
export function useRotatingIndex(count: number, itemsKey: string, rotateSeconds: number, isVisible: boolean, hasCycle: boolean) {
  const [index, setIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const advance = () => {
    setFadeIn(false);
    setTimeout(() => {
      setIndex(i => (i + 1) % Math.max(1, count));
      setFadeIn(true);
    }, 250);
  };

  const [prevKey, setPrevKey] = useState(itemsKey);
  if (itemsKey !== prevKey) {
    setPrevKey(itemsKey);
    setIndex(0);
    setFadeIn(true);
  }

  const wasVisibleRef = useRef(isVisible);
  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    wasVisibleRef.current = isVisible;
    if (hasCycle && !wasVisible && isVisible && count > 1) advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, hasCycle, count]);

  useEffect(() => {
    if (hasCycle || count <= 1) return;
    const interval = setInterval(advance, Math.max(4, rotateSeconds) * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCycle, itemsKey, count, rotateSeconds]);

  return { index: Math.min(index, Math.max(0, count - 1)), fadeIn };
}

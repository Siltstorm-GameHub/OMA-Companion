"use client";

// ============================================
// OMA Quest — Kampf-Effekte (Pixel-Animationen) und Klassen-Icon
// ============================================

import { useEffect, useRef, useState } from "react";
import { getMonster } from "@/lib/dnd/combat";
import { playSfx, sfxForFx } from "@/lib/dnd/oq-sfx";
import { FX_SHEETS } from "@/lib/dnd/oq-fx-manifest";
import { CLASS_ICON, fxFromLine, newLines, type FxEvent } from "@/lib/dnd/oq-fx";

const FPS = 16;
const SCALE = 2.5;

/** Spielt einen Effekt einmal ab und blendet ihn aus (Spritesheet-Streifen per CSS steps()). */
function Burst({ ev, scale = 1 }: { ev: FxEvent; scale?: number }) {
  const sheet = FX_SHEETS[ev.kind];
  const px = Math.round(Math.min(160, sheet.size * SCALE) * scale);
  // Lange Sheets (Tod, Regeneration …) laufen schneller, damit kein Effekt länger als gut 1 s dauert
  const ms = Math.round(Math.min(1100, (sheet.frames / FPS) * 1000));
  return (
    <span
      aria-hidden
      className="oq-fx pointer-events-none absolute left-1/2 top-1/2"
      style={{
        width: px, height: px, marginLeft: -px / 2, marginTop: -px / 2,
        backgroundImage: `url(/oq/fx/${ev.kind}.png)`, backgroundSize: `${sheet.frames * px}px ${px}px`,
        animation: `oq-fx-play ${ms}ms steps(${sheet.frames}) 1 forwards, oq-fx-out 200ms ease-out ${Math.max(0, ms - 100)}ms forwards`,
        ["--fx-w" as string]: `${sheet.frames * px}px`,
      }}
    />
  );
}

/** Schwebende Zahl (Schaden, Heilung, „Verfehlt“): steigt auf und blendet aus. Mehrere gleichzeitig weichen leicht seitlich aus. */
function FloatText({ ev }: { ev: FxEvent }) {
  if (!ev.float) return null;
  const dx = ((ev.id * 37) % 41) - 20;
  return (
    <span aria-hidden className={`oq-float oq-float-${ev.float.tone} pointer-events-none absolute left-1/2 top-[22%]`} style={{ marginLeft: dx }}>
      {ev.float.text}
    </span>
  );
}

/** Effekte und schwebende Zahlen über ihrem Träger (der Träger braucht `relative`). */
export function FxLayer({ events, scale = 1 }: { events: FxEvent[]; scale?: number }) {
  return <>{events.map((e) => <span key={e.id}><Burst ev={e} scale={scale} /><FloatText ev={e} /></span>)}</>;
}

/** Erkennt neue Kampfzeilen und liefert die Effekte dazu (nur die jüngsten bleiben im Speicher). Der erste Aufruf spielt nichts nach. */
export function useFxEvents(log: string[], heroNames: string[] = [], classFor?: (line: string) => string | undefined): FxEvent[] {
  const [st, setSt] = useState<{ prev: string[]; events: FxEvent[]; seq: number }>({ prev: log, events: [], seq: 0 });
  if (st.prev !== log && (st.prev.length !== log.length || st.prev[st.prev.length - 1] !== log[log.length - 1])) {
    let seq = st.seq;
    const added: FxEvent[] = [];
    // Beim erneuten Öffnen eines laufenden Kampfs kommt das ganze Log auf einmal: nichts nachspielen
    const fresh = st.prev.length === 0 && log.length > 3 ? [] : newLines(st.prev, log);
    for (const line of fresh) {
      const fx = fxFromLine(line, heroNames, classFor);
      if (fx) added.push({ ...fx, id: ++seq });
    }
    setSt({ prev: log, events: [...st.events, ...added].slice(-8), seq });
  }
  // Klänge zu neuen Effekten (einmal je Effekt)
  const played = useRef(st.seq);
  useEffect(() => {
    for (const e of st.events) if (e.id > played.current) playSfx(sfxForFx(e.kind, e.id));
    played.current = st.seq;
  }, [st.events, st.seq]);
  return st.events;
}

/** Klänge zum Kampfverlauf: Monster brüllt beim Beginn (Bosse tiefer), Sieg- bzw. Niederlage-Klang beim Ende. */
export function useFightSounds(monsterId: string | undefined, status: string | undefined): void {
  const lastMonster = useRef<string | undefined>(undefined);
  const lastStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (monsterId && monsterId !== lastMonster.current && (status === "active" || status === "ACTIVE")) playSfx(getMonster(monsterId)?.raid || (getMonster(monsterId)?.level ?? 0) >= 9 ? "boss" : "roar");
    lastMonster.current = monsterId;
    const was = lastStatus.current;
    const active = (x?: string) => x === "active" || x === "ACTIVE";
    if (active(was) && status && !active(status)) playSfx(status === "won" || status === "WON" ? "win" : status === "lost" || status === "LOST" ? "lose" : "click");
    lastStatus.current = status;
  }, [monsterId, status]);
}

/** Klassen-Symbol (Avatar-RPG-Set); bei unbekannter Klasse das Krieger-Symbol. */
export function ClassIcon({ classId, size = 28, className = "" }: { classId: string; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={CLASS_ICON(classId)} alt="" width={size} height={size} className={`inline-block shrink-0 object-contain ${className}`} style={{ width: size, height: size }} />
  );
}

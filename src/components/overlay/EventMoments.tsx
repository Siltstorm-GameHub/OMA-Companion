"use client";

/**
 * Live-Momente des Event-Overlays: Ergebnis-Banner, Phasenwechsel, Platzwechsel-Pfeile, Durchsage
 * des Veranstalters und Siegerehrung. Die Erkennung (was ist neu?) steckt in lib/overlay-moments.ts,
 * hier nur Zeitsteuerung und Darstellung.
 */
import { useEffect, useState } from "react";
import RankedAvatar from "@/components/RankedAvatar";
import { BRAND_LOGO } from "@/lib/brand";
import { Crown, Megaphone, Star, Trophy } from "@/components/icons";
import { buildResultView, detectMoments, type Moment, type ResultView } from "@/lib/overlay-moments";
import { TopEdge } from "./tiles";
import {
  CEREMONY_MS, displayName,
  type EventOverlayState, type OverlayAnnouncement, type OverlayUser,
} from "./types";

const RESULT_MS = 8000;
const PHASE_MS = 6500;
/** So lange stehen die Platzwechsel-Pfeile nach einem Ergebnis in der Tabelle. */
const MOVEMENT_MS = 30_000;
/** Mehr als das staut sich nicht an — sonst laufen nach einer Ergebnis-Welle minutenlang alte Banner. */
const MAX_QUEUE = 4;

type Positions = Map<string, { position: number }>;

/**
 * Vergleicht jeden neuen Stand mit dem vorherigen: neue Ergebnisse/Phasen landen in einer
 * Warteschlange (eins nach dem anderen), geänderte Tabellenplätze als Pfeile für MOVEMENT_MS.
 * `paused` (z.B. während der Siegerehrung) leert die Warteschlange.
 */
export function useEventMoments(state: EventOverlayState, positions: Positions, paused: boolean) {
  // Vergleich mit dem vorherigen Stand direkt beim Rendern (wie useZoomTransition) — der erste
  // Stand nach dem Laden erzeugt bewusst nichts.
  const [prevState, setPrevState] = useState(state);
  const [queue, setQueue] = useState<Moment[]>([]);
  if (prevState !== state) {
    setPrevState(state);
    const found = paused ? [] : detectMoments(prevState, state);
    if (found.length > 0) setQueue(q => [...q, ...found.filter(f => !q.some(o => o.key === f.key))].slice(-MAX_QUEUE));
  }
  if (paused && queue.length > 0) setQueue([]);

  // Platzwechsel: Signatur statt Map-Identität, die Map entsteht bei jedem Render neu.
  const signature = [...positions].map(([id, p]) => `${id}:${p.position}`).join(",");
  const [prevSignature, setPrevSignature] = useState(signature);
  const [prevPositions, setPrevPositions] = useState(positions);
  const [movement, setMovement] = useState<{ key: string; delta: Record<string, number> } | null>(null);
  if (prevSignature !== signature) {
    setPrevSignature(signature);
    setPrevPositions(positions);
    const delta: Record<string, number> = {};
    for (const [id, p] of positions) {
      const old = prevPositions.get(id)?.position;
      if (old != null && old !== p.position) delta[id] = old - p.position;
    }
    if (Object.keys(delta).length > 0) setMovement({ key: signature, delta });
  }
  useEffect(() => {
    if (!movement) return;
    const t = setTimeout(() => setMovement(null), MOVEMENT_MS);
    return () => clearTimeout(t);
  }, [movement]);

  const current = queue[0] ?? null;
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue(q => q.slice(1)), current.kind === "result" ? RESULT_MS : PHASE_MS);
    return () => clearTimeout(t);
  }, [current]);

  return { moment: current, movement: movement?.delta ?? EMPTY_MOVEMENT };
}

const EMPTY_MOVEMENT: Record<string, number> = {};

/** true bis zum Zeitpunkt `until` (ms), rendert genau dann einmal neu. */
export function useActiveUntil(until: number | null): boolean {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until == null) return;
    const rest = until - Date.now();
    if (rest <= 0) return;
    const t = setTimeout(() => setNow(Date.now()), rest + 50);
    return () => clearTimeout(t);
  }, [until]);
  return until != null && now < until;
}

/** Läuft die Siegerehrung gerade (CEREMONY_MS ab dem ersten Abschluss)? */
export function useCeremonyActive(state: EventOverlayState): boolean {
  const until = state.ceremony && state.completedAt ? new Date(state.completedAt).getTime() + CEREMONY_MS : null;
  return useActiveUntil(until);
}

// ── Ebene oben mittig: Durchsage + Banner ────────────────────────────────────

/** Oben mittig über allem — links davon die Marke, rechts die Panels des Standardlayouts. */
export function TopCenterStack({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", width: 860, zIndex: 70,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14, pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

function BannerShell({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className="oma-anim-slidein"
      style={{
        position: "relative", width: "100%", boxSizing: "border-box",
        background: "rgba(9,9,14,0.9)",
        backdropFilter: "blur(18px) saturate(1.4)", WebkitBackdropFilter: "blur(18px) saturate(1.4)",
        border: accent ? "1px solid rgba(196,163,255,0.45)" : "1px solid rgba(94,234,212,0.25)",
        borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "16px 26px", overflow: "hidden",
      }}
    >
      <TopEdge radius={16} breathe />
      {children}
    </div>
  );
}

const smallCaps: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(94,234,212,0.85)" };

/** Durchsage des Veranstalters, optional mit Countdown bis zum Ablauf. */
export function AnnouncementBanner({ announcement }: { announcement: OverlayAnnouncement | null }) {
  const visible = useActiveUntil(announcement?.until ?? null) || (!!announcement && announcement.until == null);
  const [now, setNow] = useState(() => Date.now());
  const counting = visible && !!announcement?.countdown && announcement.until != null;
  useEffect(() => {
    if (!counting) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [counting]);
  if (!announcement || !visible) return null;

  const rest = announcement.until != null ? Math.max(0, Math.ceil((announcement.until - now) / 1000)) : 0;
  const clock = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, "0")}`;
  return (
    <BannerShell key={announcement.id} accent>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Megaphone size={30} style={{ color: "#c4a3ff", flexShrink: 0, filter: "drop-shadow(0 0 8px rgba(196,163,255,0.5))" }} />
        <span style={{ flex: 1, fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>{announcement.text}</span>
        {counting && (
          <span style={{ fontSize: 30, fontWeight: 800, color: "#c4a3ff", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{clock}</span>
        )}
      </div>
    </BannerShell>
  );
}

/** Ergebnis- oder Phasen-Banner (immer nur eins, siehe useEventMoments). */
export function MomentBanner({
  moment, state, userOf,
}: { moment: Moment; state: EventOverlayState; userOf: (id: string | null) => OverlayUser | undefined }) {
  if (moment.kind === "phase") {
    return (
      <BannerShell key={moment.key}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "center" }}>
          <Trophy size={40} style={{ color: "#5eead4", filter: "drop-shadow(0 0 10px rgba(45,212,191,0.5))" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>{moment.title}</span>
            {moment.detail && <span style={{ fontSize: 18, color: "#5eead4", fontWeight: 600 }}>{moment.detail}</span>}
          </div>
        </div>
      </BannerShell>
    );
  }
  const match = state.matches.find(m => m.id === moment.matchId);
  const view = match ? buildResultView(match, state) : null;
  if (!view) return null;
  return (
    <BannerShell key={moment.key}>
      <ResultBody view={view} userOf={userOf} highlightUserId={state.streamer?.id ?? null} />
    </BannerShell>
  );
}

function ResultBody({ view, userOf, highlightUserId }: { view: ResultView; userOf: (id: string | null) => OverlayUser | undefined; highlightUserId: string | null }) {
  if (view.kind === "duel") {
    const draw = !view.winnerId;
    const side = (id: string, align: "left" | "right") => {
      const user = userOf(id);
      const winner = view.winnerId === id;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, flexDirection: align === "right" ? "row-reverse" : "row" }}>
          <div className={winner ? "oma-anim-flare" : undefined} style={{ borderRadius: 999, flexShrink: 0 }}>
            <RankedAvatar userId={user?.id} src={user?.image} alt={displayName(user)} size={52} />
          </div>
          <span
            style={{
              fontSize: 24, fontWeight: winner ? 800 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: winner ? "#5eead4" : id === highlightUserId ? "#c4a3ff" : "#fff",
              textShadow: winner ? "0 0 18px rgba(45,212,191,0.5)" : "none", textAlign: align === "right" ? "right" : "left",
            }}
          >
            {displayName(user)}
          </span>
        </div>
      );
    };
    const hasScore = view.score1 != null || view.score2 != null;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={smallCaps}>Ergebnis · {view.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 18, width: "100%" }}>
          {side(view.player1Id, "right")}
          <span className="oma-anim-pop" style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {hasScore ? <>{view.score1 ?? 0}<span style={{ opacity: 0.35, margin: "0 8px" }}>:</span>{view.score2 ?? 0}</> : <span style={{ fontSize: 22, opacity: 0.6 }}>vs</span>}
          </span>
          {side(view.player2Id, "left")}
        </div>
        {(draw || view.aggregate) && (
          <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>
            {draw ? "Unentschieden" : `Gesamt ${view.aggregate!.score1} : ${view.aggregate!.score2}`}
          </span>
        )}
      </div>
    );
  }

  const medal = (place: number) => (place === 1 ? "#facc15" : place === 2 ? "#cbd5e1" : place === 3 ? "#d97706" : "rgba(255,255,255,0.5)");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <span style={smallCaps}>Ergebnis · {view.label}</span>
      {view.headline && <span className="oma-anim-pop" style={{ fontSize: 30, fontWeight: 800, color: "#5eead4" }}>{view.headline}</span>}
      <div style={{ display: "flex", justifyContent: "center", gap: 26, width: "100%" }}>
        {view.rows.map(r => {
          const user = userOf(r.userId);
          return (
            <div key={r.userId} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: medal(r.place), flexShrink: 0 }}>{r.place}.</span>
              <RankedAvatar userId={user?.id} src={user?.image} alt={displayName(user)} size={40} />
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: 19, fontWeight: 700, color: r.userId === highlightUserId ? "#c4a3ff" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 190 }}>
                  {displayName(user)}
                </span>
                {r.text && <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", whiteSpace: "nowrap" }}>{r.text}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Siegerehrung ─────────────────────────────────────────────────────────────

/** Podium (Platz 2 – 1 – 3), MVP und Tabellenpunkte für die Reihe — für CEREMONY_MS nach dem Abschluss. */
export function CeremonyView({ state, userOf }: { state: EventOverlayState; userOf: (id: string | null) => OverlayUser | undefined }) {
  const ceremony = state.ceremony!;
  // Nur bekannte User (z.B. keine Team-IDs) — eine Stufe ohne Namen wäre leer.
  const places = ceremony.placements
    .map(group => group.filter(id => userOf(id)))
    .filter(group => group.length > 0)
    .slice(0, 3);
  const mvp = ceremony.mvpUserId ? userOf(ceremony.mvpUserId) : undefined;
  // Podium-Reihenfolge links → rechts: 2., 1., 3.
  const podium = [places[1] ? { place: 2, ids: places[1] } : null, places[0] ? { place: 1, ids: places[0] } : null, places[2] ? { place: 3, ids: places[2] } : null]
    .filter((p): p is { place: number; ids: string[] } => !!p);
  const color = (place: number) => (place === 1 ? "#facc15" : place === 2 ? "#cbd5e1" : "#d97706");
  const height = (place: number) => (place === 1 ? 190 : place === 2 ? 140 : 105);

  return (
    <div className="oma-anim-zoomin" style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,6,9,0.93)" }}>
      <div style={{ position: "absolute", top: 40, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
        <img src={BRAND_LOGO} alt="" width={76} height={76} style={{ display: "block", filter: "drop-shadow(0 0 16px rgba(20,184,166,0.5))" }} />
        <span style={{ ...smallCaps, fontSize: 16 }}>Siegerehrung</span>
        <span style={{ fontSize: 44, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em", maxWidth: 1400, textAlign: "center" }}>{state.title}</span>
      </div>

      {podium.length > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: mvp ? 190 : 110, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 34 }}>
          {podium.map(({ place, ids }) => (
            <div key={place} className="oma-anim-slidein" style={{ width: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, animationDelay: `${(3 - place) * 350}ms`, animationFillMode: "both" }}>
              {place === 1 && <Crown size={46} style={{ color: "#facc15", filter: "drop-shadow(0 0 14px rgba(250,204,21,0.6))" }} />}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18 }}>
                {ids.slice(0, 3).map(id => {
                  const user = userOf(id)!;
                  const points = state.ligaPunkteByUser[id];
                  return (
                    <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, maxWidth: ids.length > 1 ? 150 : 340 }}>
                      <div className={place === 1 ? "oma-anim-flare" : undefined} style={{ borderRadius: 999 }}>
                        <RankedAvatar userId={user.id} src={user.image} alt={displayName(user)} size={place === 1 ? 112 : 88} />
                      </div>
                      <span style={{ fontSize: place === 1 ? 28 : 22, fontWeight: 800, color: id === state.streamer?.id ? "#c4a3ff" : "#fff", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                        {displayName(user)}
                      </span>
                      {points ? <span style={{ fontSize: 16, fontWeight: 700, color: "#5eead4" }}>+{Math.round(points)} Tabellenpunkte</span> : null}
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  width: "100%", height: height(place), borderRadius: "14px 14px 0 0",
                  background: `linear-gradient(180deg, ${color(place)}33 0%, rgba(255,255,255,0.03) 100%)`,
                  border: `1px solid ${color(place)}66`, borderBottom: "none",
                  display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 12, boxSizing: "border-box",
                }}
              >
                <span style={{ fontSize: 56, fontWeight: 800, color: color(place) }}>{place}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: "#5eead4" }}>Turnier beendet — danke fürs Mitspielen!</span>
        </div>
      )}

      {mvp && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 60, display: "flex", justifyContent: "center" }}>
          <div className="oma-anim-slidein" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 26px", borderRadius: 999, background: "rgba(196,163,255,0.12)", border: "1px solid rgba(196,163,255,0.45)", animationDelay: "1200ms", animationFillMode: "both" }}>
            <Star size={28} style={{ color: "#c4a3ff" }} />
            <span style={{ ...smallCaps, color: "#c4a3ff" }}>MVP</span>
            <RankedAvatar userId={mvp.id} src={mvp.image} alt={displayName(mvp)} size={44} />
            <span style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{displayName(mvp)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND_LOGO } from "@/lib/brand";
import RankedAvatar from "@/components/RankedAvatar";

type OverlayEntry = {
  id: string;
  userId: string | null;
  teamId: string | null;
  placement: number | null;
  score: number | null;
  statsJson: string | null;
};

type OverlayMatch = {
  id: string;
  round: number;
  position: number;
  title: string | null;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  score1: number | null;
  score2: number | null;
  playedAt: string | null;
  entries: OverlayEntry[];
};

type OverlayUser = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
type OverlayParticipant = { userId: string; user: OverlayUser };

/** In diesem Projekt hält `name` die rohe (meist kleingeschriebene) Discord-Login-Kennung,
 *  `username` den vom User selbst gepflegten Anzeigenamen mit korrekter Groß-/Kleinschreibung —
 *  daher hier wie im Rest der App `username` zuerst. */
function displayName(u: OverlayUser | undefined | null): string {
  return u?.username ?? u?.name ?? "Unbekannt";
}

type OverlayState = {
  id: string;
  title: string;
  status: string;
  format: string | null;
  tournamentStatus: string | null;
  game: string | null;
  statFields: string | null;
  matches: OverlayMatch[];
  participants: OverlayParticipant[];
};

type PanelKey = "bracket" | "table" | "participants";
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "middle-left" | "middle-right";

const PANEL_FADE_MS = 900;
const TICKER_CLEARANCE = 210; // Höhe des Lower-Third-Tickers + Abstand — Panels in unteren Ecken schieben sich darüber

/** Absolute Positionierung für eine Ecke — Panels in den unteren Ecken rücken über den
 *  Ticker, damit sie ihn nicht überlappen. Welche Ecke beim jeweiligen Spiel HUD-frei ist,
 *  kann die Browser-Source nicht selbst erkennen (sie sieht das Gameplay-Bild nicht) —
 *  das legt der Streamer in den Overlay-Einstellungen einmalig fest.               */
function cornerStyle(corner: Corner): React.CSSProperties {
  const base: React.CSSProperties = { position: "absolute" };
  switch (corner) {
    case "top-left":     return { ...base, top: 56, left: 56 };
    case "top-right":    return { ...base, top: 56, right: 56 };
    case "bottom-left":  return { ...base, bottom: TICKER_CLEARANCE, left: 56 };
    case "bottom-right": return { ...base, bottom: TICKER_CLEARANCE, right: 56 };
    case "middle-left":  return { ...base, top: "50%", left: 56 };
    case "middle-right": return { ...base, top: "50%", right: 56 };
  }
}

/** Opacity/Blur/Versatz für eine Rotations-Phase, kombiniert mit der Basis-Zentrierung der
 *  Ecke (nur bei "middle-*" nötig — darf vom Versatz nicht überschrieben werden, siehe
 *  cornerStyle). "enter" kommt leicht aus Richtung Bildschirmmitte verschwommen herein,
 *  "leave" wandert in dieselbe Richtung weiter und verschwimmt wieder — zusammen eine klare
 *  Bewegungsrichtung statt eines reinen Stand-Fades. */
function panelMotionStyle(corner: Corner, phase: PanelPhase): React.CSSProperties {
  const centerY = corner.startsWith("middle") ? "translateY(-50%)" : "";
  if (phase === "settled") {
    return { opacity: 1, filter: "blur(0px)", transform: `${centerY} translateY(0)`.trim() };
  }
  const towardEdge = corner.startsWith("bottom") ? 14 : -14;
  const offset = phase === "enter" ? -towardEdge : towardEdge;
  return { opacity: 0, filter: "blur(6px)", transform: `${centerY} translateY(${offset}px)`.trim() };
}

/** Einmal eingebettete Keyframes für alle Bewegungs-Akzente im Overlay: Live-Puls, Score-Pop
 *  bei Änderung, Sieger-Glow, Kachel-Entrance bei neuem Match, sanftes Atmen der Ränder. */
function MotionStyles() {
  return (
    <style>{`
      @keyframes oma-pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes oma-pop     { 0% { transform: scale(0.6); opacity: 0; } 65% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes oma-flare   { 0% { box-shadow: 0 0 0 0 rgba(45,212,191,0); } 25% { box-shadow: 0 0 28px 6px rgba(45,212,191,0.55); } 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0); } }
      @keyframes oma-slidein { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes oma-breathe { 0%,100% { border-top-color: rgba(20,184,166,0.4); } 50% { border-top-color: rgba(20,184,166,0.85); } }
      .oma-anim-pop     { animation: oma-pop 420ms cubic-bezier(0.16,1,0.3,1) both; }
      .oma-anim-flare   { animation: oma-flare 1100ms ease-out; }
      .oma-anim-slidein { animation: oma-slidein 480ms cubic-bezier(0.16,1,0.3,1) both; }
      .oma-anim-breathe { animation: oma-breathe 3.2s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .oma-anim-pop, .oma-anim-flare, .oma-anim-slidein, .oma-anim-breathe { animation: none !important; }
      }
    `}</style>
  );
}

export default function OverlayClient({
  eventId,
  token,
  eventTitle,
  format,
  requestedPanels,
  rotateSeconds,
  corner,
}: {
  eventId: string;
  token: string;
  eventTitle: string;
  format: string | null;
  requestedPanels: PanelKey[] | null;
  rotateSeconds: number;
  corner: Corner;
}) {
  const [state, setState] = useState<OverlayState | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const es = new EventSource(`/api/overlay/${eventId}/stream?token=${encodeURIComponent(token)}`);
      esRef.current = es;
      es.addEventListener("update", (e) => {
        try { setState(JSON.parse((e as MessageEvent).data)); } catch { /* ignore */ }
      });
      es.onerror = () => {
        es.close();
        if (!cancelled) setTimeout(connect, 1500);
      };
    }

    connect();
    return () => {
      cancelled = true;
      esRef.current?.close();
    };
  }, [eventId, token]);

  const userByUserId = new Map((state?.participants ?? []).map(p => [p.userId, p.user]));
  const userOf = (userId: string | null): OverlayUser | undefined => (userId ? userByUserId.get(userId) : undefined);

  const fmt = state?.format ?? format;
  const matches = state?.matches ?? [];
  const participantCount = state?.participants.length ?? 0;

  const isElimination = fmt === "single_elimination" || fmt === "double_elimination";
  const defaultPanels: PanelKey[] = isElimination ? ["bracket", "participants"] : ["table", "participants"];
  const availablePanels = (requestedPanels ?? defaultPanels).filter(key => {
    if (key === "bracket") return matches.length > 0;
    if (key === "table") return matches.length > 0 || participantCount > 0;
    if (key === "participants") return participantCount > 0;
    return false;
  });

  const rotator = usePanelRotator(availablePanels, rotateSeconds);
  const ticker = pickTickerMatch(matches);

  return (
    <div
      style={{
        position: "relative",
        width: "1920px",
        height: "1080px",
        fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <MotionStyles />
      <BrandMark />

      {ticker && (
        <MatchTicker match={ticker} userOf={userOf} eventTitle={state?.title ?? eventTitle} game={state?.game ?? null} />
      )}

      {state && (rotator.active || rotator.previous) && (
        <div style={{ ...cornerStyle(corner), width: 620 }}>
          {/* Alte und neue Kachel überlappen sich für PANEL_FADE_MS — die alte blendet aus/verschwimmt,
             während die neue schon einblendet, statt einer sichtbaren Lücke dazwischen. */}
          {rotator.previous && (
            <div
              style={{
                position: rotator.active ? "absolute" : "static",
                inset: 0,
                transition: `opacity ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), filter ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
                ...panelMotionStyle(corner, rotator.previous.phase),
              }}
            >
              <PanelContent panelKey={rotator.previous.key} matches={matches} userOf={userOf} format={fmt} statFields={state.statFields} participants={state.participants} />
            </div>
          )}
          {rotator.active && (
            <div
              style={{
                position: rotator.previous ? "absolute" : "static",
                inset: 0,
                transition: `opacity ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), filter ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
                ...panelMotionStyle(corner, rotator.active.phase),
              }}
            >
              <PanelContent panelKey={rotator.active.key} matches={matches} userOf={userOf} format={fmt} statFields={state.statFields} participants={state.participants} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PanelContent({
  panelKey, matches, userOf, format, statFields, participants,
}: {
  panelKey: PanelKey;
  matches: OverlayMatch[];
  userOf: (id: string | null) => OverlayUser | undefined;
  format: string | null;
  statFields: string | null;
  participants: OverlayParticipant[];
}) {
  if (panelKey === "bracket") return <BracketPanel matches={matches} userOf={userOf} />;
  if (panelKey === "table") return <TablePanel matches={matches} participants={participants} format={format} statFields={statFields} />;
  return <ParticipantsPanel participants={participants} />;
}

type PanelPhase = "enter" | "settled" | "leave";
type PanelSlot = { key: PanelKey; phase: PanelPhase };

/** Rotation als Crossfade: die neue Kachel beginnt einzublenden, während die alte noch
 *  ausblendet ("previous") — kein Zeitpunkt, an dem beide unsichtbar sind. Beide Seiten
 *  starten aus ihrem jeweiligen Zielzustand und flippen einen Tick später (setTimeout 30ms,
 *  React braucht einen Paint dazwischen, sonst überspringt der Browser die CSS-Transition)
 *  gleichzeitig in ihre Endposition. */
function usePanelRotator(panels: PanelKey[], rotateSeconds: number) {
  const indexRef = useRef(0);
  const [active, setActive] = useState<PanelSlot | null>(panels.length ? { key: panels[0], phase: "settled" } : null);
  const [previous, setPrevious] = useState<PanelSlot | null>(null);

  // Panel-Liste hat sich geändert (Format erkannt / Query-Param) — Zustand während des
  // Renders zurücksetzen statt in einem Effect, siehe react.dev "Adjusting state on prop change".
  const panelsKey = panels.join("|");
  const [prevPanelsKey, setPrevPanelsKey] = useState(panelsKey);
  if (panelsKey !== prevPanelsKey) {
    setPrevPanelsKey(panelsKey);
    indexRef.current = 0;
    setActive(panels.length ? { key: panels[0], phase: "settled" } : null);
    setPrevious(null);
  }

  useEffect(() => {
    if (panels.length <= 1) return;
    const showMs = Math.max(4, rotateSeconds) * 1000;
    let flipTimer: ReturnType<typeof setTimeout>;
    let clearTimer: ReturnType<typeof setTimeout>;

    const cycle = setInterval(() => {
      setActive(curr => {
        if (curr) setPrevious({ key: curr.key, phase: "settled" });
        indexRef.current = (indexRef.current + 1) % panels.length;
        return { key: panels[indexRef.current], phase: "enter" };
      });

      flipTimer = setTimeout(() => {
        setPrevious(p => (p ? { ...p, phase: "leave" } : p));
        setActive(a => (a ? { ...a, phase: "settled" } : a));
      }, 30);

      clearTimer = setTimeout(() => setPrevious(null), 30 + PANEL_FADE_MS);
    }, showMs);

    return () => {
      clearInterval(cycle);
      clearTimeout(flipTimer);
      clearTimeout(clearTimer);
    };
  }, [panels.length, rotateSeconds]);

  return { active, previous };
}

function pickTickerMatch(matches: OverlayMatch[]): OverlayMatch | null {
  // FFA/Coop/Avg-Stats-Matches haben nie player1Id/player2Id gesetzt (die stecken in
  // entries) — ohne den entries-Fallback hier würde ein anstehendes FFA-Match nie als
  // "pending" erkannt und der Ticker zeigt nur je das zuletzt gespielte Match.
  const pending = matches
    .filter(m => (m.player1Id || m.player2Id || m.entries.length > 0) && !m.winnerId && !m.playedAt)
    .sort((a, b) => a.round - b.round || a.position - b.position);
  if (pending.length > 0) return pending[0];
  const played = [...matches].filter(m => m.playedAt).sort((a, b) =>
    new Date(b.playedAt!).getTime() - new Date(a.playedAt!).getTime()
  );
  return played[0] ?? null;
}

/* ── Broadcast-Branding: Logo + Wortmarke unten links, dauerhaft sichtbar ── */
function BrandMark() {
  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        bottom: 34,
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity: 0.65,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
      <img src={BRAND_LOGO} alt="" width={26} height={26} style={{ display: "block", filter: "drop-shadow(0 0 6px rgba(20,184,166,0.35))" }} />
      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#e8e8f0" }}>
        Old Masters Ally
      </span>
    </div>
  );
}

/* ── Lower-Third: zwei getrennte Kacheln statt einer durchgehenden Leiste —
   links Status/Event/Spiel, rechts das eigentliche Match. Bewusst getrennt, damit
   dazwischen wieder Gameplay durchscheint statt einer über die volle Breite reichenden
   Fläche. ── */
function MatchTicker({
  match, userOf, eventTitle, game,
}: { match: OverlayMatch; userOf: (id: string | null) => OverlayUser | undefined; eventTitle: string; game: string | null }) {
  const isLive = !match.winnerId && !match.playedAt;
  const p1Winner = !!match.winnerId && match.winnerId === match.player1Id;
  const p2Winner = !!match.winnerId && match.winnerId === match.player2Id;
  const hasDuel = !!(match.player1Id || match.player2Id);

  return (
    <div style={{ position: "absolute", left: 56, bottom: 96, display: "flex", alignItems: "center", gap: 16 }}>
      <TickerTile breathe={isLive}>
        <StatusPill live={isLive} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
            {eventTitle}
          </span>
          {game && (
            <span style={{ fontSize: 12, color: "rgba(94,234,212,0.75)", fontWeight: 500 }}>
              {game}
            </span>
          )}
        </div>
      </TickerTile>

      {/* key=match.id lässt die Kachel bei jedem neuen laufenden/nächsten Match einmal
         einschweben, statt kommentarlos den Inhalt zu tauschen. */}
      <TickerTile key={match.id}>
        {hasDuel ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <PlayerName user={userOf(match.player1Id)} winner={p1Winner} winnerKey={match.winnerId} align="right" />
            <Score score1={match.score1} score2={match.score2} />
            <PlayerName user={userOf(match.player2Id)} winner={p2Winner} winnerKey={match.winnerId} align="left" />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {[...match.entries]
              .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
              .slice(0, 6)
              .map(e => {
                const u = userOf(e.userId);
                const first = e.placement === 1;
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <RankedAvatar rankPoints={u?.rankPoints ?? 0} src={u?.image} alt={displayName(u)} size={30} />
                    <span style={{ fontSize: 16, fontWeight: first ? 700 : 500, color: first ? "#5eead4" : "#fff" }}>
                      {displayName(u)}{e.score != null ? ` · ${e.score}` : ""}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </TickerTile>
    </div>
  );
}

function TickerTile({ children, breathe }: { children: React.ReactNode; breathe?: boolean }) {
  return (
    <div
      className={`oma-anim-slidein${breathe ? " oma-anim-breathe" : ""}`}
      style={{
        background: "rgba(9,9,14,0.82)",
        backdropFilter: "blur(18px) saturate(1.4)",
        WebkitBackdropFilter: "blur(18px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "2px solid rgba(20,184,166,0.65)",
        borderRadius: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "18px 26px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

function StatusPill({ live }: { live: boolean }) {
  return (
    <span
      style={{
        display: "flex", alignItems: "center", gap: 7,
        fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        padding: "6px 12px", borderRadius: 999,
        color: live ? "#fca5a5" : "#5eead4",
        background: live ? "rgba(239,68,68,0.12)" : "rgba(20,184,166,0.12)",
        border: `1px solid ${live ? "rgba(239,68,68,0.35)" : "rgba(20,184,166,0.3)"}`,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 6, height: 6, borderRadius: 999,
          background: live ? "#f87171" : "#2dd4bf",
          animation: live ? "oma-pulse 1.4s ease-in-out infinite" : undefined,
        }}
      />
      {live ? "Live" : "Zuletzt"}
    </span>
  );
}

function PlayerName({
  user, winner, winnerKey, align,
}: { user: OverlayUser | undefined; winner: boolean; winnerKey: string | null; align: "left" | "right" }) {
  const name = displayName(user);
  const row = (
    <>
      {/* key=winnerKey lässt den Glow einmal aufflackern, sobald ein Sieger feststeht,
         statt ihn dauerhaft leuchten zu lassen. */}
      <div key={winner ? winnerKey : "pending"} className={winner ? "oma-anim-flare" : undefined} style={{ borderRadius: 999 }}>
        <RankedAvatar rankPoints={user?.rankPoints ?? 0} src={user?.image} alt={name} size={40} />
      </div>
      <span
        style={{
          fontSize: 24, fontWeight: winner ? 700 : 500,
          color: winner ? "#5eead4" : "#fff",
          textShadow: winner ? "0 0 18px rgba(45,212,191,0.5)" : "none",
        }}
      >
        {name}
      </span>
    </>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 200, flexDirection: align === "right" ? "row-reverse" : "row" }}>
      {row}
    </div>
  );
}

function Score({ score1, score2 }: { score1: number | null; score2: number | null }) {
  if (score1 == null && score2 == null) {
    return <span style={{ fontSize: 22, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>vs</span>;
  }
  return (
    <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", display: "flex", gap: 10 }}>
      {/* key=score* lässt die Ziffer bei jeder Änderung einmal "poppen", statt sie
         unbemerkt auszutauschen — genau das Signal, das ein Live-Score braucht. */}
      <span key={`s1-${score1}`} className="oma-anim-pop">{score1 ?? 0}</span>
      <span style={{ opacity: 0.35 }}>:</span>
      <span key={`s2-${score2}`} className="oma-anim-pop">{score2 ?? 0}</span>
    </span>
  );
}

/* ── Panel-Shell: gemeinsamer Rahmen für Bracket/Tabelle/Teilnehmer ── */
function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(9,9,14,0.86)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "2px solid rgba(20,184,166,0.5)",
        borderRadius: 16,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "22px 24px",
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5eead4", margin: "0 0 16px" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

/* ── Bracket-Panel: Runden nebeneinander, kompakt für Elimination-Formate ── */
function BracketPanel({ matches, userOf }: { matches: OverlayMatch[]; userOf: (id: string | null) => OverlayUser | undefined }) {
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  return (
    <PanelShell title="Turnierbaum">
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 620, overflow: "hidden" }}>
        {rounds.map(round => (
          <div key={round}>
            <p style={{ fontSize: 10, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
              Runde {round}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {matches.filter(m => m.round === round).map(m => (
                <BracketRow key={m.id} match={m} userOf={userOf} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function BracketRow({ match, userOf }: { match: OverlayMatch; userOf: (id: string | null) => OverlayUser | undefined }) {
  const p1Winner = !!match.winnerId && match.winnerId === match.player1Id;
  const p2Winner = !!match.winnerId && match.winnerId === match.player2Id;
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "7px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
      <Row user={userOf(match.player1Id)} score={match.score1} winner={p1Winner} />
      <Row user={userOf(match.player2Id)} score={match.score2} winner={p2Winner} />
    </div>
  );
}

function Row({ user, score, winner }: { user: OverlayUser | undefined; score: number | null; winner: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: winner ? 700 : 400, color: winner ? "#5eead4" : "rgba(255,255,255,0.85)" }}>
      <RankedAvatar rankPoints={user?.rankPoints ?? 0} src={user?.image} alt={displayName(user)} size={22} />
      <span style={{ flex: 1 }}>{displayName(user)}</span>
      {score != null && <span>{score}</span>}
    </div>
  );
}

type RankedRow = { userId: string; user: OverlayUser; primary: string; secondary: string };

/** Tabellen-Panel — die Berechnung unterscheidet sich bewusst je Turnierformat, weil die
 *  zugrunde liegenden Datenfelder unterschiedlich sind: Liga/Round-Robin tragen Sieger in
 *  `Match.winnerId`, FFA/Coop/Avg-Stats dagegen in `MatchEntry.placement`/`statsJson` — ein
 *  reiner winnerId-Sieg-Zähler zeigt bei FFA-Formaten für jeden Teilnehmer 0 an. Spiegelt
 *  die Logik aus LigaView/RoundRobinView/FfaView, nur kompakter fürs Overlay. */
function TablePanel({
  matches, participants, format, statFields,
}: { matches: OverlayMatch[]; participants: OverlayParticipant[]; format: string | null; statFields: string | null }) {
  const isFfaFamily = format === "ffa" || format === "coop_stats" || format === "avg_stats";
  const title = format === "liga" ? "Liga-Tabelle" : isFfaFamily ? "Gesamtranking" : "Tabelle";
  const ranked = isFfaFamily
    ? buildFfaRanking(matches, participants, format, statFields)
    : buildMatchRanking(matches, participants, format);

  return (
    <PanelShell title={title}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {ranked.slice(0, 12).map((p, i) => (
          <div
            key={p.userId}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "7px 8px", borderRadius: 7,
              background: i < 3 ? "rgba(20,184,166,0.06)" : "transparent",
            }}
          >
            <span style={{ width: 20, fontSize: 13, opacity: 0.4, textAlign: "right" }}>{i + 1}</span>
            <RankedAvatar rankPoints={p.user.rankPoints} src={p.user.image} alt={displayName(p.user)} size={26} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: i < 3 ? 700 : 400, color: i < 3 ? "#5eead4" : "#fff" }}>
              {displayName(p.user)}
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 76 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? "#5eead4" : "#fff" }}>{p.primary}</span>
              {p.secondary && <span style={{ fontSize: 11, opacity: 0.5 }}>{p.secondary}</span>}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

/** Liga (mit Unentschieden) / Round-Robin (ohne) — Sieg=3, Unentschieden=1, sortiert nach
 *  Punkten, dann Siegen, dann Tordifferenz. Identische Punktelogik wie LigaView/RoundRobinView. */
function buildMatchRanking(matches: OverlayMatch[], participants: OverlayParticipant[], format: string | null): RankedRow[] {
  const supportsDraw = format === "liga";
  type Acc = { w: number; d: number; l: number; pts: number; scored: number; conceded: number };
  const map = new Map<string, Acc>(participants.map(p => [p.userId, { w: 0, d: 0, l: 0, pts: 0, scored: 0, conceded: 0 }]));

  for (const m of matches) {
    const isDraw = supportsDraw && !!m.playedAt && !m.winnerId;
    if (!m.winnerId && !isDraw) continue;

    if (isDraw) {
      for (const uid of [m.player1Id, m.player2Id]) {
        const s = uid ? map.get(uid) : undefined;
        if (s) { s.d += 1; s.pts += 1; }
      }
    } else if (m.winnerId) {
      const w = map.get(m.winnerId);
      if (w) { w.w += 1; w.pts += 3; }
      const loserId = m.player1Id === m.winnerId ? m.player2Id : m.player1Id;
      const l = loserId ? map.get(loserId) : undefined;
      if (l) l.l += 1;
    }

    if (m.player1Id && m.score1 != null) {
      const s = map.get(m.player1Id);
      if (s) { s.scored += m.score1; s.conceded += m.score2 ?? 0; }
    }
    if (m.player2Id && m.score2 != null) {
      const s = map.get(m.player2Id);
      if (s) { s.scored += m.score2; s.conceded += m.score1 ?? 0; }
    }
  }

  return participants
    .map(p => {
      const s = map.get(p.userId)!;
      const secondary = supportsDraw ? `${s.w}S · ${s.d}U · ${s.l}N` : `${s.w}S · ${s.l}N`;
      return { userId: p.userId, user: p.user, s, secondary, primary: `${s.pts} Pkt.` };
    })
    .sort((a, b) => b.s.pts - a.s.pts || b.s.w - a.s.w || (b.s.scored - b.s.conceded) - (a.s.scored - a.s.conceded));
}

/** FFA / Coop-Stats / Avg-Stats — Sieger stecken in MatchEntry, nicht in Match.winnerId.
 *  coop_stats zählt "Match Win"-Flags, avg_stats den Durchschnitt über alle Stat-Felder,
 *  ffa die Summe des ersten (primären) Stat-Felds — identische Sortierlogik wie FfaView. */
function buildFfaRanking(
  matches: OverlayMatch[], participants: OverlayParticipant[], format: string, statFieldsJson: string | null,
): RankedRow[] {
  let statFields: string[] = [];
  try { statFields = statFieldsJson ? JSON.parse(statFieldsJson) : []; } catch { /* ignore */ }
  const isAvg  = format === "avg_stats";
  const isCoop = format === "coop_stats";

  const totals = new Map<string, { stats: Record<string, number>; matchCount: number }>(
    participants.map(p => [p.userId, { stats: {}, matchCount: 0 }])
  );
  for (const m of matches) {
    if (!m.playedAt) continue;
    for (const e of m.entries) {
      if (!e.userId) continue;
      let t = totals.get(e.userId);
      if (!t) { t = { stats: {}, matchCount: 0 }; totals.set(e.userId, t); }
      t.matchCount += 1;
      if (e.statsJson) {
        try {
          const s = JSON.parse(e.statsJson) as Record<string, number>;
          for (const [k, v] of Object.entries(s)) t.stats[k] = (t.stats[k] ?? 0) + v;
        } catch { /* ignore */ }
      }
    }
  }

  return participants
    .map(p => {
      const t = totals.get(p.userId) ?? { stats: {}, matchCount: 0 };
      let primary: string;
      if (isCoop) {
        primary = `${t.stats["Match Win"] ?? 0} Siege`;
      } else if (isAvg) {
        const avg = statFields.length > 0 && t.matchCount > 0
          ? statFields.map(f => (t.stats[f] ?? 0) / t.matchCount).reduce((a, b) => a + b, 0) / statFields.length
          : 0;
        primary = t.matchCount > 0 ? `Ø ${avg.toFixed(1)}` : "–";
      } else {
        const primaryField = statFields[0];
        primary = primaryField ? `${t.stats[primaryField] ?? 0} ${primaryField}` : `${t.matchCount} Runden`;
      }
      return { userId: p.userId, user: p.user, t, primary, secondary: "" };
    })
    .sort((a, b) => {
      if (a.t.matchCount === 0 && b.t.matchCount === 0) return 0;
      if (a.t.matchCount === 0) return 1;
      if (b.t.matchCount === 0) return -1;
      if (isCoop) return (b.t.stats["Match Win"] ?? 0) - (a.t.stats["Match Win"] ?? 0);
      if (isAvg) {
        const avgOf = (t: typeof a.t) => statFields.length > 0
          ? statFields.map(f => (t.stats[f] ?? 0) / t.matchCount).reduce((s, v) => s + v, 0) / statFields.length
          : 0;
        return avgOf(b.t) - avgOf(a.t);
      }
      for (const f of statFields) {
        const diff = (b.t.stats[f] ?? 0) - (a.t.stats[f] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
}

/* ── Teilnehmer-Panel ── */
function ParticipantsPanel({ participants }: { participants: OverlayParticipant[] }) {
  return (
    <PanelShell title="Teilnehmer">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
        {participants.slice(0, 24).map(p => (
          <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <RankedAvatar rankPoints={p.user.rankPoints} src={p.user.image} alt={displayName(p.user)} size={24} />
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName(p.user)}
            </span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

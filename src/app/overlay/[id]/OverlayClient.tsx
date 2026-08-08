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
  matches: OverlayMatch[];
  participants: OverlayParticipant[];
};

type PanelKey = "bracket" | "table" | "participants";
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const PANEL_FADE_MS = 700;
const PANEL_GAP_MS = 900; // vollständig transparente Pause zwischen zwei Panels — Spiel bleibt kurz frei sichtbar
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
  }
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
      <BrandMark />

      {ticker && (
        <MatchTicker match={ticker} userOf={userOf} eventTitle={state?.title ?? eventTitle} game={state?.game ?? null} />
      )}

      {rotator.activeKey && state && (
        <div
          key={rotator.activeKey}
          style={{
            ...cornerStyle(corner),
            width: 620,
            opacity: rotator.visible ? 1 : 0,
            transform: rotator.visible ? "translateY(0)" : `translateY(${corner.startsWith("bottom") ? "12px" : "-12px"})`,
            transition: `opacity ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
          }}
        >
          {rotator.activeKey === "bracket" && <BracketPanel matches={matches} userOf={userOf} />}
          {rotator.activeKey === "table" && <TablePanel matches={matches} participants={state.participants} format={fmt} />}
          {rotator.activeKey === "participants" && <ParticipantsPanel participants={state.participants} />}
        </div>
      )}
    </div>
  );
}

/* ── Rotation-Logik: zeigt genau ein Panel, blendet es aus, pausiert komplett
   transparent, blendet das nächste ein. Bei genau einem Panel keine Rotation. ── */
function usePanelRotator(panels: PanelKey[], rotateSeconds: number) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Panel-Liste hat sich geändert (Format erkannt / Query-Param) — Index während des
  // Renders zurücksetzen statt in einem Effect, siehe react.dev "Adjusting state on prop change".
  const panelsKey = panels.join("|");
  const [prevPanelsKey, setPrevPanelsKey] = useState(panelsKey);
  if (panelsKey !== prevPanelsKey) {
    setPrevPanelsKey(panelsKey);
    setIndex(0);
    setVisible(true);
  }

  useEffect(() => {
    if (panels.length <= 1) return;
    const showMs = Math.max(4, rotateSeconds) * 1000;
    let hideTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;

    const cycle = setInterval(() => {
      setVisible(false);
      hideTimer = setTimeout(() => {
        setIndex(i => (i + 1) % panels.length);
        nextTimer = setTimeout(() => setVisible(true), 30);
      }, PANEL_FADE_MS + PANEL_GAP_MS);
    }, showMs + PANEL_FADE_MS + PANEL_GAP_MS);

    return () => {
      clearInterval(cycle);
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [panels.length, rotateSeconds]);

  return { activeKey: panels[index] ?? null, visible };
}

function pickTickerMatch(matches: OverlayMatch[]): OverlayMatch | null {
  const pending = matches
    .filter(m => (m.player1Id || m.player2Id) && !m.winnerId && !m.playedAt)
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
      <TickerTile>
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

      <TickerTile>
        {hasDuel ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <PlayerName user={userOf(match.player1Id)} winner={p1Winner} align="right" />
            <Score score1={match.score1} score2={match.score2} />
            <PlayerName user={userOf(match.player2Id)} winner={p2Winner} align="left" />
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

function TickerTile({ children }: { children: React.ReactNode }) {
  return (
    <div
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
          animation: live ? "oma-ov-pulse 1.4s ease-in-out infinite" : undefined,
        }}
      />
      {live ? "Live" : "Zuletzt"}
      <style>{`@keyframes oma-ov-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
    </span>
  );
}

function PlayerName({ user, winner, align }: { user: OverlayUser | undefined; winner: boolean; align: "left" | "right" }) {
  const name = displayName(user);
  const row = (
    <>
      <RankedAvatar rankPoints={user?.rankPoints ?? 0} src={user?.image} alt={name} size={40} />
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
      <span>{score1 ?? 0}</span>
      <span style={{ opacity: 0.35 }}>:</span>
      <span>{score2 ?? 0}</span>
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

/* ── Tabellen-Panel: Sieg-basiertes Ranking für Liga/Round-Robin ── */
function TablePanel({
  matches, participants, format,
}: { matches: OverlayMatch[]; participants: OverlayParticipant[]; format: string | null }) {
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  for (const m of matches) {
    if (!m.winnerId) continue;
    wins.set(m.winnerId, (wins.get(m.winnerId) ?? 0) + 1);
    const loserId = m.player1Id === m.winnerId ? m.player2Id : m.player1Id;
    if (loserId) losses.set(loserId, (losses.get(loserId) ?? 0) + 1);
  }
  const ranked = [...participants]
    .map(p => ({ ...p, w: wins.get(p.userId) ?? 0, l: losses.get(p.userId) ?? 0 }))
    .sort((a, b) => b.w - a.w || a.l - b.l);

  return (
    <PanelShell title={format === "liga" ? "Liga-Tabelle" : "Tabelle"}>
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
            <span style={{ fontSize: 13, opacity: 0.6 }}>{p.w}S · {p.l}N</span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
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

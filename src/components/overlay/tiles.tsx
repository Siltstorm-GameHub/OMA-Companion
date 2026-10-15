"use client";

/**
 * Einzelne Overlay-Kacheln (Marke/Streamer, Live-Info, Match-Ticker, Lieblingsspiele) und ihr
 * gemeinsames Chrome (PanelShell, TopEdge, LiveBadge).
 */
import { useEffect, useState } from "react";
import { BRAND_LOGO } from "@/lib/brand";
import RankedAvatar from "@/components/RankedAvatar";
import { AutoScrollViewport } from "./AutoScrollViewport";
import {
  displayName, ELEMENT_SIZE, TICKER_ENTRIES_WIDTH,
  type OverlayMatch, type OverlayUser, type OverlayStreamer,
} from "./types";

export function parseStatFields(json: string | null | undefined): string[] {
  try { return json ? JSON.parse(json) : []; } catch { return []; }
}

/** Formatiert die in dieser Runde für einen Teilnehmer eingetragenen Stat-Werte für den
 *  Ticker — coop_stats zeigt vor allem Sieg/Niederlage (gilt für alle Spieler der Runde
 *  gemeinsam, siehe FfaView), alle anderen Felder werden als "Feld Wert" angehängt. */
function formatEntryStats(statsJson: string | null, fields: string[], isCoop: boolean): string {
  if (!statsJson) return "";
  let stats: Record<string, number> = {};
  try { stats = JSON.parse(statsJson); } catch { return ""; }

  const parts: string[] = [];
  if (isCoop && "Match Win" in stats) {
    parts.push(stats["Match Win"] > 0 ? "Sieg" : "Niederlage");
  }
  const relevantFields = fields.length > 0 ? fields : Object.keys(stats);
  for (const f of relevantFields) {
    if (f === "Match Win" || stats[f] == null) continue;
    parts.push(`${stats[f]} ${f}`);
  }
  return parts.join(" · ");
}

export function pickTickerMatch(matches: OverlayMatch[]): OverlayMatch | null {
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

const FLIP_INTERVAL_MS = 6000;
const FLIP_DURATION_MS = 1100;
export const FLIP_WIDTH = ELEMENT_SIZE.brand.width;
export const FLIP_HEIGHT = ELEMENT_SIZE.brand.height;
/** Neue, fixe Marken-Kachel: Vorderseite OMA-Logo+Wortmarke, Rückseite Avatar+Name+Twitch-Icon
 *  des Streamers, der diesen Link erzeugt hat. Ohne bekannten Streamer (sehr alte Links, oder
 *  wenn der User seither gelöscht wurde) bleibt sie als einzelne, nicht drehende OMA-Fläche
 *  stehen — ein Flip auf eine leere Rückseite wäre sinnlos. */
export function IdentityFlipTile({ streamer }: { streamer: OverlayStreamer | null }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!streamer) return;
    const t = setInterval(() => setFlipped(f => !f), FLIP_INTERVAL_MS);
    return () => clearInterval(t);
  }, [streamer]);

  const omaFace = (
    <FlipFace justify="center">
      {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
      <img src={BRAND_LOGO} alt="" width={32} height={32} style={{ display: "block", filter: "drop-shadow(0 0 8px rgba(20,184,166,0.4))" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff" }}>
          Old Masters Ally
        </span>
        {/* Für Zuschauer: schnell erkennbar, wo sie die Community/App finden — ohne diesen
           Hinweis kannte man die URL nur, wenn der Streamer sie mündlich erwähnt. */}
        <span style={{ fontSize: 12, fontWeight: 500, color: "#5eead4" }}>
          www.oma-app.de
        </span>
      </div>
    </FlipFace>
  );

  if (!streamer) {
    return <div style={{ position: "relative", width: FLIP_WIDTH, height: FLIP_HEIGHT }}>{omaFace}</div>;
  }

  const name = displayName(streamer);
  return (
    <div style={{ position: "relative", width: FLIP_WIDTH, height: FLIP_HEIGHT, perspective: 500 }}>
      <div
        className="oma-flip-inner"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.6,0.04,0.32,0.96)`,
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {omaFace}
        <FlipFace back>
          <RankedAvatar badge={null} userId={streamer.id} src={streamer.image} alt={name} size={36} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </span>
            {streamer.twitchLogin && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color: "#c4a3ff" }}>
                <TwitchGlyph size={12} />
                {streamer.twitchLogin}
              </span>
            )}
          </div>
        </FlipFace>
      </div>
    </div>
  );
}

/** Kleines Twitch-Glyphen-Icon (offizielles "Glitch"-Symbol, vereinfacht) — keine Icon-Library
 *  im Projekt führt Twitch, also als winziges Inline-SVG statt eines externen Assets. */
export function TwitchGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#9146FF" aria-hidden="true">
      <path d="M4.3 2 2 7.4v13h5.4V23l3.2-2.6h4.3L21.9 14V2H4.3Zm15.4 11-3.6 3.6h-4.3l-3.2 2.6v-2.6H5.7V3.6h14v9.4Z" />
      <path d="M16.5 6.4h1.8v5.4h-1.8V6.4Zm-4.9 0h1.8v5.4h-1.8V6.4Z" />
    </svg>
  );
}

/** Eigenständige, nicht drehende Kachel für "Live + Eventname + Spielname" — bis vor Kurzem der
 *  Vorderseite der Brand-Flip-Kachel, jetzt ein eigenes, frei positionierbares Element. */
export function LiveInfoTile({ eventTitle, game, isLive }: { eventTitle: string; game: string | null; isLive: boolean }) {
  return (
    <TickerTile breathe={isLive} bodyStyle={{ width: ELEMENT_SIZE.liveinfo.width, height: ELEMENT_SIZE.liveinfo.height, padding: "0 20px" }}>
      <LiveBadge live={isLive} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {eventTitle}
        </span>
        {game && (
          <span style={{ fontSize: 11, color: "rgba(94,234,212,0.75)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {game}
          </span>
        )}
      </div>
    </TickerTile>
  );
}

/** Eine vollständige "Kachel" als Flip-Fläche — trägt ihr eigenes Chrome (Glas-Hintergrund,
 *  Rahmen, Schatten, Farbverlauf-Kante), damit beim Drehen wirklich die ganze Karte kippt und
 *  nicht nur ihr Inhalt. */
function FlipFace({
  children, back, breathe, justify = "flex-start",
}: { children: React.ReactNode; back?: boolean; breathe?: boolean; justify?: React.CSSProperties["justifyContent"] }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0,
        backfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
        background: "rgba(9,9,14,0.82)",
        backdropFilter: "blur(18px) saturate(1.4)",
        WebkitBackdropFilter: "blur(18px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "0 26px",
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        gap: 14,
        overflow: "hidden",
      }}
    >
      <TopEdge radius={14} breathe={breathe} />
      {children}
    </div>
  );
}

/** Deutlich kräftigerer Live-Indikator als der vorherige einfache Opacity-Puls: ein
 *  auslaufender Leuchtring hinter einem hellen Kernpunkt. Im "Zuletzt"-Zustand ruhig. */
export function LiveBadge({ live }: { live: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, flexShrink: 0 }}>
      {live && (
        <span
          className="oma-live-ring"
          style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#f87171" }}
        />
      )}
      <span
        style={{
          position: "relative", width: 10, height: 10, borderRadius: 999,
          background: live ? "#f87171" : "#2dd4bf",
          boxShadow: live ? "0 0 10px 2px rgba(248,113,113,0.8)" : "0 0 8px 1px rgba(45,212,191,0.6)",
        }}
      />
    </span>
  );
}

/* ── Match-Kachel des Lower-Thirds. Steht neben der BrandFlipTile (Live/Event/Spiel ↔ Logo) —
   bewusst als eigene Kachel statt einer über die volle Breite reichenden Leiste, damit
   dazwischen wieder Gameplay durchscheint. ── */
export function MatchTicker({
  match, userOf, format, statFields,
}: { match: OverlayMatch; userOf: (id: string | null) => OverlayUser | undefined; format?: string | null; statFields?: string | null }) {
  const p1Winner = !!match.winnerId && match.winnerId === match.player1Id;
  const p2Winner = !!match.winnerId && match.winnerId === match.player2Id;
  const hasDuel = !!(match.player1Id || match.player2Id);
  const isCoop = format === "coop_stats";
  const fields = parseStatFields(statFields);

  return (
    <div style={{ height: "100%" }}>
      {/* key=match.id lässt die Kachel bei jedem neuen laufenden/nächsten Match einmal
         einschweben, statt kommentarlos den Inhalt zu tauschen. */}
      <TickerTile key={match.id}>
        {hasDuel ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%" }}>
            <PlayerName user={userOf(match.player1Id)} winner={p1Winner} winnerKey={match.winnerId} align="right" />
            <Score score1={match.score1} score2={match.score2} />
            <PlayerName user={userOf(match.player2Id)} winner={p2Winner} winnerKey={match.winnerId} align="left" />
          </div>
        ) : (
          // Alle Mitspieler dieser Runde, nicht nur die ersten paar — bei vielen Teilnehmern
          // (z.B. Coop-Runden mit 8+ Leuten) übernimmt AutoScrollViewport das Durchblättern,
          // statt Namen stillschweigend abzuschneiden. FFA/Coop/Avg-Stats-Matches tragen ihr
          // Ergebnis in entry.statsJson, nicht in entry.score (das Feld bleibt dort ungenutzt) —
          // ohne das hier auszulesen stünde neben jedem Namen nur nichts.
          <AutoScrollViewport axis="x" size={TICKER_ENTRIES_WIDTH}>
            {[...match.entries]
              .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
              .map((e, i) => {
                const u = userOf(e.userId);
                const first = e.placement === 1;
                const statsLabel = formatEntryStats(e.statsJson, fields, isCoop);
                return (
                  <div
                    key={e.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: i === 0 ? 0 : 16, flexShrink: 0 }}
                  >
                    <RankedAvatar badge={null} userId={u?.id} src={u?.image} alt={displayName(u)} size={30} />
                    <span style={{ fontSize: 16, fontWeight: first ? 700 : 500, color: first ? "#5eead4" : "#fff", whiteSpace: "nowrap" }}>
                      {displayName(u)}{statsLabel ? ` · ${statsLabel}` : ""}
                    </span>
                  </div>
                );
              })}
          </AutoScrollViewport>
        )}
      </TickerTile>
    </div>
  );
}

export function TickerTile({
  children, breathe, bodyStyle,
}: { children: React.ReactNode; breathe?: boolean; bodyStyle?: React.CSSProperties }) {
  return (
    <div
      className="oma-anim-slidein"
      style={{
        position: "relative",
        background: "rgba(9,9,14,0.82)",
        backdropFilter: "blur(18px) saturate(1.4)",
        WebkitBackdropFilter: "blur(18px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "0 22px",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 16,
        overflow: "hidden",
        ...bodyStyle,
      }}
    >
      <TopEdge radius={14} breathe={breathe} />
      {children}
    </div>
  );
}

/** Farbverlauf-Kante Teal → Weinrot oben an jeder Kachel — als eigenes Element statt
 *  `border-top`, weil ein CSS-Border keinen Verlauf einzeln je Seite unterstützt. */
export function TopEdge({ radius, breathe }: { radius: number; breathe?: boolean }) {
  return (
    <div
      className={breathe ? "oma-anim-breathe" : undefined}
      style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, #14b8a6 0%, #5eead4 20%, #14b8a6 45%, #7a1f3d 75%, #9f2b52 100%)",
        borderTopLeftRadius: radius, borderTopRightRadius: radius,
      }}
    />
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
        <RankedAvatar badge={null} userId={user?.id} src={user?.image} alt={name} size={32} />
      </div>
      <span
        style={{
          fontSize: 19, fontWeight: winner ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: winner ? "#5eead4" : "#fff",
          textShadow: winner ? "0 0 18px rgba(45,212,191,0.5)" : "none",
        }}
      >
        {name}
      </span>
    </>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: 150, minWidth: 0, flexDirection: align === "right" ? "row-reverse" : "row" }}>
      {row}
    </div>
  );
}

function Score({ score1, score2 }: { score1: number | null; score2: number | null }) {
  if (score1 == null && score2 == null) {
    return <span style={{ fontSize: 20, color: "rgba(255,255,255,0.3)", fontWeight: 600, flexShrink: 0 }}>vs</span>;
  }
  return (
    <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", display: "flex", gap: 8, flexShrink: 0 }}>
      {/* key=score* lässt die Ziffer bei jeder Änderung einmal "poppen", statt sie
         unbemerkt auszutauschen — genau das Signal, das ein Live-Score braucht. */}
      <span key={`s1-${score1}`} className="oma-anim-pop">{score1 ?? 0}</span>
      <span style={{ opacity: 0.35 }}>:</span>
      <span key={`s2-${score2}`} className="oma-anim-pop">{score2 ?? 0}</span>
    </span>
  );
}

/* ── Panel-Shell: gemeinsamer Rahmen für Bracket/Tabelle/Teilnehmer ── */
export function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        background: "rgba(9,9,14,0.86)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "15px 18px",
        overflow: "hidden",
        // Füllt die feste Kachelhöhe (StackedLayout) — ohne feste Höhe einfach so hoch wie der Inhalt.
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <TopEdge radius={16} />
      {/* Wasserzeichen — füllt die Kachel, bleibt aber weit im Hintergrund (niedrige Opacity,
         z-index 0) und stört den eigentlichen Inhalt (z-index 1) nicht beim Lesen. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
      <img
        src={BRAND_LOGO}
        alt=""
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "contain", padding: 28,
          opacity: 0.05, filter: "grayscale(1)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5eead4", margin: "0 0 9px" }}>
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

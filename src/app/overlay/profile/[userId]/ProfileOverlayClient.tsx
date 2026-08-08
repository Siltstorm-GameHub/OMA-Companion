"use client";

import { useEffect, useRef, useState } from "react";
import RankedAvatar from "@/components/RankedAvatar";
import {
  MotionStyles, PanelShell, IdentityFlipTile, FavoritesPanel, BadgesPanel, TopEdge,
  panelMotionStyle, type Corner, type PanelPhase, type FavoriteGame, type ShowcaseBadge, type OverlayStreamer,
} from "@/app/overlay/[id]/OverlayClient";

type ProfileState = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  twitchLogin: string | null;
  rankPoints: number;
  rankLabel: string;
  rankPct: number;
  favoriteGames: FavoriteGame[];
  badges: ShowcaseBadge[];
  nextEvent: { id: string; title: string; startAt: string; game: string | null } | null;
};

/** Elemente des persönlichen Profil-Overlays — kleinerer Satz als beim Event-Overlay, da kein
 *  Turnierkontext existiert. "brand" bleibt fix und nie Teil eines Stapels, der Rest darf sich
 *  wie beim Event-Overlay zu einer rotierenden Gruppe stapeln. */
export type ProfileElementKey = "brand" | "rank" | "nextEvent" | "favorites" | "badges";
export const PROFILE_STACKABLE: ProfileElementKey[] = ["rank", "nextEvent", "favorites", "badges"];
export type ProfileLayoutPositions = Partial<Record<ProfileElementKey, { x: number; y: number }>>;

export const PROFILE_ELEMENT_SIZE: Record<ProfileElementKey, { width: number; height: number }> = {
  brand:     { width: 300, height: 78 },
  rank:      { width: 320, height: 90 },
  nextEvent: { width: 380, height: 90 },
  favorites: { width: 460, height: 220 },
  badges:    { width: 460, height: 140 },
};

const EDGE_MARGIN = 28;
const PANEL_FADE_MS = 900;

function elementPositionStyle(pos: { x: number; y: number } | undefined): React.CSSProperties {
  if (!pos) return { position: "absolute", top: EDGE_MARGIN, right: EDGE_MARGIN };
  return { position: "absolute", left: `${pos.x}%`, top: `${pos.y}%` };
}

type ElementSlot = { key: ProfileElementKey; phase: PanelPhase };

/** Identisches Muster zu useStackedElements im Event-Overlay (siehe dort für die ausführliche
 *  Begründung) — hier lokal dupliziert, weil der Element-Schlüsseltyp ein anderer ist und der
 *  Aufwand einer generischen, modulübergreifenden Version für vier mögliche Elemente den
 *  Nutzen nicht lohnt. */
function useStackedProfileElements(buckets: Record<string, { pos: { x: number; y: number }; keys: ProfileElementKey[] }>, rotateSeconds: number) {
  const [active, setActive] = useState<Record<string, ElementSlot>>({});
  const [previous, setPrevious] = useState<Record<string, ElementSlot | null>>({});

  const bucketsSig = Object.entries(buckets).map(([pos, b]) => `${pos}=${b.keys.join(",")}`).sort().join("|");
  const [prevSig, setPrevSig] = useState(bucketsSig);
  if (bucketsSig !== prevSig) {
    setPrevSig(bucketsSig);
    const initActive: Record<string, ElementSlot> = {};
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
        timeouts.push(setTimeout(() => setPrevious(p => ({ ...p, [pos]: null })), 30 + PANEL_FADE_MS));
      }, showMs));
    }

    return () => {
      intervals.forEach(clearInterval);
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketsSig, rotateSeconds]);

  return { active, previous };
}

export default function ProfileOverlayClient({
  userId, token, layout, rotateSeconds,
}: { userId: string; token: string; layout: ProfileLayoutPositions | null; rotateSeconds: number }) {
  const [state, setState] = useState<ProfileState | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    function connect() {
      if (cancelled) return;
      const es = new EventSource(`/api/overlay/profile/${userId}/stream?token=${encodeURIComponent(token)}`);
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
    return () => { cancelled = true; esRef.current?.close(); };
  }, [userId, token]);

  const streamer: OverlayStreamer | null = state ? {
    id: state.id, name: state.name, username: state.username, image: state.image,
    rankPoints: state.rankPoints, twitchLogin: state.twitchLogin,
    favoriteGames: state.favoriteGames, badges: state.badges,
  } : null;

  const elementAvailable: Record<ProfileElementKey, boolean> = {
    brand: true,
    rank: !!state,
    nextEvent: !!state?.nextEvent,
    favorites: !!state?.favoriteGames.length,
    badges: !!state?.badges.length,
  };

  const stacks: Record<string, { pos: { x: number; y: number }; keys: ProfileElementKey[] }> = {};
  if (layout) {
    for (const key of PROFILE_STACKABLE) {
      const pos = layout[key];
      if (!pos || !elementAvailable[key]) continue;
      const posKey = `${pos.x.toFixed(1)},${pos.y.toFixed(1)}`;
      (stacks[posKey] ??= { pos, keys: [] }).keys.push(key);
    }
  }
  const rotator = useStackedProfileElements(stacks, rotateSeconds);
  const corner: Corner = "top-right"; // nur für die Crossfade-Bewegungsrichtung relevant, keine echte Ecken-Positionierung hier

  return (
    <div
      style={{
        position: "relative", width: "1920px", height: "1080px",
        fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)", color: "#fff", overflow: "hidden",
      }}
    >
      <MotionStyles />

      {layout?.brand && (
        <div style={elementPositionStyle(layout.brand)}>
          <IdentityFlipTile streamer={streamer} />
        </div>
      )}

      {Object.entries(stacks).map(([posKey, stack]) => {
        const slot = rotator.active[posKey] ?? null;
        const prevSlot = rotator.previous[posKey] ?? null;
        if (!slot && !prevSlot) return null;
        const width = Math.max(...stack.keys.map(k => PROFILE_ELEMENT_SIZE[k].width));
        return (
          <div key={posKey} style={{ ...elementPositionStyle(stack.pos), width }}>
            {prevSlot && (
              <div
                style={{
                  position: slot ? "absolute" : "static", inset: 0,
                  transition: `opacity ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), filter ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
                  ...panelMotionStyle(corner, prevSlot.phase),
                }}
              >
                <ProfileElementContent elementKey={prevSlot.key} state={state} />
              </div>
            )}
            {slot && (
              <div
                style={{
                  position: prevSlot ? "absolute" : "static", inset: 0,
                  transition: `opacity ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1), filter ${PANEL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
                  ...panelMotionStyle(corner, slot.phase),
                }}
              >
                <ProfileElementContent elementKey={slot.key} state={state} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProfileElementContent({ elementKey, state }: { elementKey: ProfileElementKey; state: ProfileState | null }) {
  if (!state) return null;
  switch (elementKey) {
    case "rank":      return <RankTile rankLabel={state.rankLabel} rankPct={state.rankPct} rankPoints={state.rankPoints} image={state.image} name={state.username ?? state.name ?? "Unbekannt"} />;
    case "nextEvent": return state.nextEvent ? <NextEventTile event={state.nextEvent} /> : null;
    case "favorites": return <FavoritesPanel games={state.favoriteGames} />;
    case "badges":    return <BadgesPanel badges={state.badges} />;
    default:          return null;
  }
}

/** Rang-Kachel: Avatar mit Rang-Ring, Rangbezeichnung und Fortschrittsbalken zum nächsten Rang. */
function RankTile({ rankLabel, rankPct, rankPoints, image, name }: { rankLabel: string; rankPct: number; rankPoints: number; image: string | null; name: string }) {
  return (
    <div
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 14,
        width: PROFILE_ELEMENT_SIZE.rank.width, height: PROFILE_ELEMENT_SIZE.rank.height,
        background: "rgba(9,9,14,0.82)", backdropFilter: "blur(18px) saturate(1.4)", WebkitBackdropFilter: "blur(18px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        padding: "0 22px", overflow: "hidden",
      }}
    >
      <TopEdge radius={14} />
      <RankedAvatar rankPoints={rankPoints} src={image} alt={name} size={48} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {rankLabel}
        </span>
        <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${rankPct}%`, borderRadius: 999, background: "linear-gradient(90deg, #14b8a6, #5eead4)" }} />
        </div>
      </div>
    </div>
  );
}

/** "Nächstes Event"-Kachel — cross-promotet die Community-Events direkt im Personal-Stream. */
function NextEventTile({ event }: { event: { title: string; startAt: string; game: string | null } }) {
  const date = new Date(event.startAt);
  const dateLabel = date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <PanelShell title="Nächstes Event">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.title}
        </span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          {dateLabel} · {timeLabel} Uhr{event.game ? ` · ${event.game}` : ""}
        </span>
      </div>
    </PanelShell>
  );
}

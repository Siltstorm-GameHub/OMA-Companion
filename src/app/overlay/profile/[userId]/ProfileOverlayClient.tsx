"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Clock, Gamepad2 } from "@/components/icons";
import RankedAvatar from "@/components/RankedAvatar";
import { getGameFallbackGradient } from "@/lib/game-cover";
import { BRAND_LOGO } from "@/lib/brand";
import { formatBerlinDate, formatBerlinTime } from "@/lib/time";
import {
  MotionStyles, PanelShell, IdentityFlipTile, FavoritesPanel, TopEdge,
  panelMotionStyle, combinedElementStyle, useVisibilityCycles,
  type Corner, type PanelPhase, type FavoriteGame, type OverlayStreamer, type ElementCycle,
} from "@/app/overlay/[id]/OverlayClient";

type ProfileState = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  twitchLogin: string | null;
  rankPoints: number;
  rankLabel: string;
  favoriteGames: FavoriteGame[];
  upcomingEvents: { id: string; title: string; startAt: string; game: string | null; coverUrl: string | null }[];
};

/** Elemente des persönlichen Profil-Overlays — kleinerer Satz als beim Event-Overlay, da kein
 *  Turnierkontext existiert. "brand" bleibt fix und nie Teil eines Stapels, der Rest darf sich
 *  wie beim Event-Overlay zu einer rotierenden Gruppe stapeln. */
export type ProfileElementKey = "brand" | "rank" | "nextEvent" | "favorites";
export const PROFILE_STACKABLE: ProfileElementKey[] = ["rank", "nextEvent", "favorites"];
export type ProfileLayoutEntry = { x: number; y: number; scale?: number; cycle?: ElementCycle };
export type ProfileLayoutPositions = Partial<Record<ProfileElementKey, ProfileLayoutEntry>>;

export const PROFILE_ELEMENT_SIZE: Record<ProfileElementKey, { width: number; height: number }> = {
  brand:     { width: 300, height: 78 },
  rank:      { width: 320, height: 90 },
  nextEvent: { width: 400, height: 110 },
  favorites: { width: 460, height: 220 },
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
    favoriteGames: state.favoriteGames,
  } : null;

  const elementAvailable: Record<ProfileElementKey, boolean> = {
    brand: true,
    rank: !!state,
    nextEvent: !!state?.upcomingEvents.length,
    favorites: !!state?.favoriteGames.length,
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

  const cycles: Partial<Record<ProfileElementKey, ElementCycle>> = {};
  if (layout) {
    for (const key of Object.keys(layout) as ProfileElementKey[]) {
      const cycle = layout[key]?.cycle;
      if (cycle) cycles[key] = cycle;
    }
  }
  const cycleVisible = useVisibilityCycles<ProfileElementKey>(cycles);
  const isVisible = (key: ProfileElementKey) => cycleVisible[key] ?? true;

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
          <div style={combinedElementStyle({}, layout.brand.scale, isVisible("brand"))}>
            <IdentityFlipTile streamer={streamer} />
          </div>
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
                style={combinedElementStyle(
                  { position: slot ? "absolute" : "static", inset: 0, ...panelMotionStyle(corner, prevSlot.phase) },
                  layout?.[prevSlot.key]?.scale,
                  isVisible(prevSlot.key),
                )}
              >
                <ProfileElementContent
                  elementKey={prevSlot.key} state={state} rotateSeconds={rotateSeconds}
                  isVisible={isVisible(prevSlot.key)} hasCycle={!!layout?.[prevSlot.key]?.cycle}
                />
              </div>
            )}
            {slot && (
              <div
                style={combinedElementStyle(
                  { position: prevSlot ? "absolute" : "static", inset: 0, ...panelMotionStyle(corner, slot.phase) },
                  layout?.[slot.key]?.scale,
                  isVisible(slot.key),
                )}
              >
                <ProfileElementContent
                  elementKey={slot.key} state={state} rotateSeconds={rotateSeconds}
                  isVisible={isVisible(slot.key)} hasCycle={!!layout?.[slot.key]?.cycle}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProfileElementContent({ elementKey, state, rotateSeconds, isVisible, hasCycle }: { elementKey: ProfileElementKey; state: ProfileState | null; rotateSeconds: number; isVisible: boolean; hasCycle: boolean }) {
  if (!state) return null;
  switch (elementKey) {
    case "rank":      return <RankTile rankLabel={state.rankLabel} userId={state.id} image={state.image} name={state.username ?? state.name ?? "Unbekannt"} />;
    case "nextEvent": return state.upcomingEvents.length ? <NextEventTile events={state.upcomingEvents} rotateSeconds={rotateSeconds} isVisible={isVisible} hasCycle={hasCycle} /> : null;
    case "favorites": return <FavoritesPanel games={state.favoriteGames} />;
    default:          return null;
  }
}

/** Rang-Kachel: Avatar mit Rang-Ring, Rangbezeichnung und Fortschrittsbalken zum nächsten Rang. */
function RankTile({ rankLabel, userId, image, name }: { rankLabel: string; userId: string; image: string | null; name: string }) {
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
      {/* Wasserzeichen — analog PanelShell, damit auch die nicht auf PanelShell basierende
         Rang-Kachel das OMA-Logo im Hintergrund trägt. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
      <img
        src={BRAND_LOGO}
        alt=""
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "contain", padding: 20,
          opacity: 0.05, filter: "grayscale(1)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
        <RankedAvatar userId={userId} src={image} alt={name} size={48} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {rankLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

/** "Nächstes Event"-Kachel — cross-promotet die kommenden Community-Events direkt im Personal-Stream.
 *  Rotiert intern durch bis zu 3 Events (unabhängig von einer Anmeldung des Streamers).
 *
 *  Zwei Rotationsmodi, je nachdem ob für diese Kachel ein Sichtbarkeits-Zyklus (`hasCycle`)
 *  konfiguriert ist:
 *  - Ohne Zyklus: freilaufender Timer im `rotateSeconds`-Takt wie die übrigen Overlay-Elemente.
 *  - Mit Zyklus: die Kachel bleibt durchgehend gemountet und wird nur weich ein-/ausgeblendet
 *    (siehe combinedElementStyle) — ein freilaufender Timer würde dann auch während der
 *    unsichtbaren Phase weiterzählen und je nach "on"-Fensterlänge zufällig nur einen
 *    Ausschnitt der Events zeigen. Stattdessen wird hier bei jedem Off→On-Wechsel exakt ein
 *    Event weitergeschaltet, sodass man bei jedem Erscheinen genau eins sieht und über mehrere
 *    Zyklusdurchläufe hinweg garantiert alle der Reihe nach.
 */
function NextEventTile({
  events, rotateSeconds, isVisible, hasCycle,
}: { events: { id: string; title: string; startAt: string; game: string | null; coverUrl: string | null }[]; rotateSeconds: number; isVisible: boolean; hasCycle: boolean }) {
  const [index, setIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const advance = () => {
    setFadeIn(false);
    setTimeout(() => {
      setIndex(i => (i + 1) % events.length);
      setFadeIn(true);
    }, 250);
  };

  // Event-Liste hat sich geändert (neues Event kam rein/fiel raus) → von vorn beginnen.
  useEffect(() => {
    setIndex(0);
    setFadeIn(true);
  }, [events.map(e => e.id).join(",")]);

  // Zyklus-Modus: bei jedem Off→On-Wechsel einen weiterschalten.
  const wasVisibleRef = useRef(isVisible);
  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    wasVisibleRef.current = isVisible;
    if (hasCycle && !wasVisible && isVisible && events.length > 1) advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, hasCycle, events.length]);

  // Timer-Modus: nur aktiv ohne Zyklus.
  useEffect(() => {
    if (hasCycle || events.length <= 1) return;
    const showMs = Math.max(4, rotateSeconds) * 1000;
    const interval = setInterval(advance, showMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCycle, events.map(e => e.id).join(","), rotateSeconds]);

  const [coverFailed, setCoverFailed] = useState(false);
  useEffect(() => setCoverFailed(false), [index]);

  const event = events[index] ?? events[0];
  const date = new Date(event.startAt);
  const dateLabel = formatBerlinDate(date, { weekday: "short", day: "2-digit", month: "2-digit" });
  const timeLabel = formatBerlinTime(date, { hour: "2-digit", minute: "2-digit" });
  const showCover = event.coverUrl && !coverFailed;

  return (
    <PanelShell title="Nächstes Event">
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12,
          opacity: fadeIn ? 1 : 0, transition: "opacity 250ms ease",
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, position: "relative" }}>
          {showCover ? (
            // eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig
            <img
              src={event.coverUrl!}
              alt=""
              onError={() => setCoverFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: getGameFallbackGradient(event.game) }} />
          )}
          <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.title}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
              <Calendar size={13} style={{ flexShrink: 0, color: "#5eead4" }} />
              {dateLabel}
              <Clock size={13} style={{ flexShrink: 0, marginLeft: 4, color: "#5eead4" }} />
              {timeLabel} Uhr
            </span>
            {event.game && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <Gamepad2 size={13} style={{ flexShrink: 0, color: "#5eead4" }} />
                {event.game}
              </span>
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

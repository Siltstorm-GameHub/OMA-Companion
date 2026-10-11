"use client";

import { useState } from "react";
import { Calendar, Clock, Gamepad2, Trophy, Clapperboard, Vote, Users } from "@/components/icons";
import RankedAvatar from "@/components/RankedAvatar";
import { getGameFallbackGradient } from "@/lib/game-cover";
import { BRAND_LOGO } from "@/lib/brand";
import { formatBerlinDate, formatBerlinTime } from "@/lib/time";
import StackedLayout from "./StackedLayout";
import { OverlayStage } from "./EventOverlayView";
import { useRotatingIndex } from "./motion";
import ZoomLayer, { useZoomTransition, ZoomBannerShell } from "./ZoomLayer";
import { PanelShell, IdentityFlipTile, TopEdge, TwitchGlyph } from "./tiles";
import {
  PROFILE_ELEMENT_SIZE, PROFILE_STACKABLE,
  type ProfileElementKey, type ProfileOverlayState, type OverlayLayout, type OverlayStreamer,
  type UpcomingEvent, type CommunityItem, type LiveMember,
} from "./types";

/**
 * Persönliches Overlay ohne Turnierkontext: Marke/Streamer, Rang, nächste Community-Events,
 * Community-Kachel und gerade live streamende Mitglieder. Reine Ansicht — Daten und Layout
 * kommen per Props.
 */
export default function ProfileOverlayView({
  state, layout, lite = false, control,
}: {
  state: ProfileOverlayState;
  layout: OverlayLayout<ProfileElementKey>;
  lite?: boolean;
  /** Live-Steuerung des Streamers (/profile/overlay/live) — fehlt bei Profil-Links ohne Steuerung. */
  control?: { hidden: ProfileElementKey[]; zoom: ProfileElementKey | null };
}) {
  const streamer: OverlayStreamer = {
    id: state.id, name: state.name, username: state.username, image: state.image,
    rankPoints: state.rankPoints, twitchLogin: state.twitchLogin,
  };

  const available: Record<ProfileElementKey, boolean> = {
    brand: true,
    rank: true,
    nextEvent: state.upcomingEvents.length > 0,
    community: state.community.length > 0,
    liveMembers: state.liveMembers.length > 0,
  };

  const zoomElement = control?.zoom && available[control.zoom] ? control.zoom : null;
  const hidden = new Set<ProfileElementKey>(control?.hidden ?? []);
  if (zoomElement) hidden.add(zoomElement);
  const zoom = useZoomTransition<ProfileElementKey>(zoomElement);

  const tile = (key: ProfileElementKey, visible: boolean, hasCycle: boolean) => {
    switch (key) {
      case "brand":       return <IdentityFlipTile streamer={streamer} />;
      case "rank":        return <RankTile rankLabel={state.rankLabel} userId={state.id} image={state.image} name={state.username ?? state.name ?? "Unbekannt"} />;
      case "nextEvent":   return <NextEventTile events={state.upcomingEvents} rotateSeconds={layout.rotateSeconds} isVisible={visible} hasCycle={hasCycle} />;
      case "community":   return <CommunityTile items={state.community} rotateSeconds={layout.rotateSeconds} isVisible={visible} hasCycle={hasCycle} />;
      case "liveMembers": return <LiveMembersTile members={state.liveMembers} />;
    }
  };

  return (
    <OverlayStage lite={lite}>
      {zoom.display && (
        <ZoomLayer
          leaving={zoom.leaving}
          width={PROFILE_ELEMENT_SIZE[zoom.display].width}
          header={
            <ZoomBannerShell>
              <RankedAvatar badge={null} userId={state.id} src={state.image} alt={streamer.username ?? "Streamer"} size={40} />
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 700, color: "#fff" }}>
                {state.twitchLogin && <TwitchGlyph size={18} />}
                {state.twitchLogin ?? state.username ?? state.name}
              </span>
            </ZoomBannerShell>
          }
        >
          {tile(zoom.display, true, false)}
        </ZoomLayer>
      )}
      {!zoom.display && <StackedLayout
        elements={layout.elements}
        fixedKey="brand"
        stackable={PROFILE_STACKABLE}
        rotateSeconds={layout.rotateSeconds}
        available={key => available[key]}
        hidden={key => hidden.has(key)}
        widthOf={key => PROFILE_ELEMENT_SIZE[key].width}
        render={(key, { visible, hasCycle }) => tile(key, visible, hasCycle)}
      />}
    </OverlayStage>
  );
}

/** Rang-Kachel: Avatar, Name und Rang-Punkte. */
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
        <RankedAvatar badge={null} userId={userId} src={image} alt={name} size={48} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
            <Trophy size={12} style={{ color: "#5eead4" }} /> {rankLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

/** "Nächstes Event" — cross-promotet die kommenden Community-Events direkt im eigenen Stream.
 *  Rotiert durch bis zu 3 Events; passt eins zum gerade gestreamten Spiel, steht es vorn und
 *  die Kachel sagt das auch. */
function NextEventTile({
  events, rotateSeconds, isVisible, hasCycle,
}: { events: UpcomingEvent[]; rotateSeconds: number; isVisible: boolean; hasCycle: boolean }) {
  const { index, fadeIn } = useRotatingIndex(events.length, events.map(e => e.id).join(","), rotateSeconds, isVisible, hasCycle);

  // Merkt sich, bei welchem Event das Cover nicht geladen werden konnte — gilt damit automatisch
  // nur für dieses eine Event, ohne beim Weiterschalten zurückgesetzt werden zu müssen.
  const [coverFailedId, setCoverFailedId] = useState<string | null>(null);

  const event = events[index] ?? events[0];
  const date = new Date(event.startAt);
  const dateLabel = formatBerlinDate(date, { weekday: "short", day: "2-digit", month: "2-digit" });
  const timeLabel = formatBerlinTime(date, { hour: "2-digit", minute: "2-digit" });
  const showCover = event.coverUrl && coverFailedId !== event.id;

  return (
    <PanelShell title={event.matchesCurrentGame ? "Passendes Event" : "Nächstes Event"}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: fadeIn ? 1 : 0, transition: "opacity 250ms ease" }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, position: "relative" }}>
          {showCover ? (
            // eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig
            <img
              src={event.coverUrl!}
              alt=""
              onError={() => setCoverFailedId(event.id)}
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

const COMMUNITY_TITLES: Record<CommunityItem["kind"], string> = {
  clip: "Clip des Monats",
  poll: "Tagesumfrage",
  wanderpokal: "Wanderpokale",
};

/** Community-Kachel: rotiert durch Clip des Monats, die laufende Tagesumfrage und die
 *  aktuellen Wanderpokal-Halter — je nachdem, was es gerade gibt. */
export function CommunityTile({
  items, rotateSeconds, isVisible, hasCycle,
}: { items: CommunityItem[]; rotateSeconds: number; isVisible: boolean; hasCycle: boolean }) {
  const { index, fadeIn } = useRotatingIndex(items.length, items.map(i => i.kind).join(","), rotateSeconds, isVisible, hasCycle);
  const item = items[index] ?? items[0];
  const textStyle: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

  return (
    <PanelShell title={item.kind === "clip" ? item.label : COMMUNITY_TITLES[item.kind]}>
      <div style={{ width: PROFILE_ELEMENT_SIZE.community.width - 36, minHeight: 96, opacity: fadeIn ? 1 : 0, transition: "opacity 250ms ease" }}>
        {item.kind === "clip" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 128, height: 72, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {item.thumbnailUrl
                // eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig
                ? <img src={item.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Clapperboard size={22} style={{ color: "#5eead4" }} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", ...textStyle }}>{item.title}</span>
              {item.by && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", ...textStyle }}>von {item.by}</span>}
            </div>
          </div>
        )}

        {item.kind === "poll" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 700, color: "#fff", ...textStyle }}>
              <Vote size={14} style={{ color: "#5eead4", flexShrink: 0 }} /> {item.question}
            </span>
            {item.options.map(o => (
              <div key={o.label} style={{ position: "relative", height: 20, borderRadius: 6, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, width: `${o.percent}%`, background: "rgba(20,184,166,0.3)", transition: "width 600ms ease" }} />
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "0 8px", fontSize: 12, lineHeight: "20px", color: "#fff" }}>
                  <span style={textStyle}>{o.label}</span>
                  <span style={{ fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{o.percent}%</span>
                </div>
              </div>
            ))}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
              {item.ended ? "Endergebnis" : "Abstimmen in der OMA-App"} · {item.totalVotes} Stimmen
            </span>
          </div>
        )}

        {item.kind === "wanderpokal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {item.holders.map(h => (
              <div key={h.title} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <RankedAvatar badge={null} src={h.image} alt={h.name} size={26} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: "#fff", ...textStyle }}>
                  <span style={{ fontWeight: 700 }}>{h.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.55)" }}> · {h.title}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#facc15", flexShrink: 0 }}>
                  <Trophy size={12} /> {h.winCount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}

/** "Gerade live aus der Community" — Raid-Tipps; Mitglieder mit demselben Spiel stehen vorn. */
export function LiveMembersTile({ members }: { members: LiveMember[] }) {
  return (
    <PanelShell title="Gerade live aus der Community">
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: PROFILE_ELEMENT_SIZE.liveMembers.width - 36 }}>
        {members.map(m => (
          <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <RankedAvatar badge={null} src={m.image} alt={m.name} size={30} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 700, color: "#fff" }}>
                <TwitchGlyph size={12} /> {m.twitchLogin}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.game || "Live"}
              </span>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#f87171", flexShrink: 0 }}>
              <Users size={12} /> {m.viewers}
            </span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

import type { ReactNode } from "react";
import { EVENT_KIND_LABEL, type EventKind } from "@/lib/event-placement";
import GameCover from "@/components/GameCover";
import { AvatarStack } from "@/components/AvatarStack";
import CoinIcon from "@/components/CoinIcon";
import { GateLink } from "@/components/GuestGate";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { Check, MessageCircle, Timer, Users } from "@/components/icons";
import { TONE_CLASSES, type EventPhaseInfo, type RelevanceTag } from "@/lib/event-display";

export type EventCardAvatar = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };

/** Plain-Daten einer Event-Kachel — gebaut vom Server (lib/event-card-data.ts), keine DB-Objekte. */
export type EventCardData = {
  id: string;
  href: string;
  title: string;
  game: string | null;
  coverUrl: string | null;
  omaOriginal: boolean;
  phase: EventPhaseInfo;
  date: { top: string; weekday: string; day: string; time: string };
  /** Überzeile, z.B. Reihe — in Reihenfarbe */
  series: { name: string; color: string; href: string } | null;
  /** "Turnier · K.-o. · Kompetitiv" */
  metaLine: string;
  playerCount: number;
  maxPlayers: number | null;
  coins: number;
  isRegistered: boolean;
  urgency: string | null;
  relevance: RelevanceTag[];
  /** Freunde/Squad zuerst sortiert */
  avatars: EventCardAvatar[];
  /** "Max, Lena" — Freunde unter den Teilnehmenden (max. 2) */
  friendNames: string[];
  communityBy: string | null;
  /** Event-Typ: Mit Platzierung ("tournament") oder Ohne Platzierung ("community", nur Teilnahme), lib/event-placement.ts */
  kind?: EventKind;
  /** Event-Absprachen: Nachrichten gesamt / ungelesen (nachträglich gesetzt, lib/event-comments.ts) */
  comments?: { total: number; unread: number } | null;
};

/**
 * - "auto" (Standard): ab sm eine Kachel (Cover 16:9 oben, feste Infozone darunter), auf dem Handy
 *   eine kompakte Agenda-Zeile.
 * - "row": immer die Agenda-Zeile — für schmale Spalten und Listen (Eventreihe, Meine Events).
 */
export type EventCardVariant = "auto" | "row";

/**
 * Eine Event-Kachel für alle Stellen. Die ganze Kachel ist über den Titel-Link klickbar
 * (Stretched Link) — echte Links für Tastatur, Mittelklick und neuen Tab; Buttons/Links im
 * Inhalt (`actions`, `extra`) liegen per `relative z-10` darüber.
 */
export default function EventCard({
  ev, actions, extra, variant = "auto",
}: {
  ev: EventCardData;
  /** Aktion rechts unten (z.B. EventCardActions) */
  actions?: ReactNode;
  /** Zusätzliche Zeile in der Infozone (z.B. Streaming-Partner, Siegprämie, Freigabe-Status) */
  extra?: ReactNode;
  variant?: EventCardVariant;
}) {
  const row = variant === "row";
  /** Klasse nur in der Kachel-Ansicht ab sm — in der Zeilen-Variante nie */
  const tile = (cls: string) => (row ? "" : cls);

  const tone = TONE_CLASSES[ev.phase.tone];
  const signal = ev.phase.label;
  const fillPct = ev.maxPlayers ? Math.min(100, Math.round((ev.playerCount / ev.maxPlayers) * 100)) : null;
  const dimmed = ev.phase.phase === "full";
  const past = ev.phase.phase === "finished";
  const border = ev.omaOriginal
    ? "border-teal-400/45"
    : ev.isRegistered && !past
      ? "border-teal-400/30"
      : ev.phase.phase === "live"
        ? "border-red-400/30"
        : ev.phase.phase === "poll" || ev.phase.phase === "gamevote"
          ? "border-violet-400/30"
          : "border-line";
  const othersCount = Math.max(0, ev.playerCount - ev.friendNames.length);

  const liveBadge = (
    <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE
    </span>
  );

  return (
    <article
      className={`surface group relative flex flex-row ${tile("sm:flex-col")} h-full overflow-hidden rounded-lg border ${border} shadow-card transition-transform duration-200 ${tile("sm:hover:-translate-y-0.5")} hover:border-line-strong focus-within:ring-2 focus-within:ring-teal-400/60 ${dimmed ? "saturate-[0.45] opacity-85" : ""} ${past ? "opacity-75 hover:opacity-100" : ""}`}
    >
      {/* Zeile: Datumsspalte */}
      <div className={`${tile("sm:hidden")} flex flex-col items-center justify-center w-12 shrink-0 leading-tight py-2`}>
        {ev.phase.phase === "live" ? liveBadge : (
          <>
            {/* "MORGEN" passt nicht in die schmale Spalte → Wochentag */}
            <span className={`text-[10px] font-semibold ${ev.date.top === "HEUTE" ? "text-teal-300" : "text-gray-400"}`}>{ev.date.top === "MORGEN" ? ev.date.weekday : ev.date.top}</span>
            <span className="text-base font-bold text-white tabular-nums">{ev.date.day}</span>
            <span className="text-[10px] text-gray-500 tabular-nums">{ev.date.time}</span>
          </>
        )}
      </div>

      {/* Cover: Zeile = Thumbnail ohne Branding, Kachel = 16:9 mit Branding */}
      <div className={`${tile("sm:hidden")} relative w-14 h-14 my-2 shrink-0 rounded-md overflow-hidden self-center`}>
        <GameCover game={ev.game} coverUrl={ev.coverUrl} className="w-full h-full" rounded="rounded-none" imgClassName="w-full h-full object-cover" />
      </div>
      {!row && (
        <div className="hidden sm:block relative aspect-video overflow-hidden shrink-0">
          <GameCover game={ev.game} coverUrl={ev.coverUrl} className="w-full h-full" rounded="rounded-none" brandBadge omaOriginal={ev.omaOriginal}
            imgClassName="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700" />
          {/* Kalenderblock */}
          <div className="absolute top-2 left-2 rounded-md bg-canvas px-2 py-1 text-center leading-tight shadow-card">
            {ev.phase.phase === "live" ? liveBadge : (
              <>
                <div className={`text-[10px] font-semibold ${ev.date.top === "HEUTE" ? "text-teal-300" : "text-gray-400"}`}>{ev.date.top}</div>
                <div className="text-lg font-bold !text-white tabular-nums">{ev.date.day}</div>
                <div className="text-[10px] text-gray-400 tabular-nums">{ev.date.time}</div>
              </>
            )}
          </div>
          {ev.isRegistered && !past && (
            <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-teal-300 shadow-card">
              <Check className="w-3 h-3" /> Dabei
            </span>
          )}
          {ev.phase.phase === "period" && ev.phase.progress != null && (
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/40" title={`${Math.round(ev.phase.progress * 100)} % des Zeitraums vorbei`}>
              <div className="h-full bg-teal-400/80" style={{ width: `${ev.phase.progress * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Infozone */}
      <div className={`flex-1 min-w-0 flex flex-col gap-1 px-2.5 py-2 ${tile("sm:px-3 sm:py-2.5")}`}>
        {(ev.series || ev.communityBy) && (
          <div className={`${row ? "flex" : "hidden sm:flex"} items-center gap-1.5 min-w-0 text-[11px] font-semibold`}>
            {ev.series && (
              <GateLink href={ev.series.href} className="relative z-10 truncate hover:underline" style={{ color: ev.series.color }}>
                {ev.series.name}
              </GateLink>
            )}
            {ev.communityBy && <span className="truncate text-violet-300/80 font-medium">Community · @{ev.communityBy}</span>}
          </div>
        )}

        <h3 className={`font-semibold text-white text-sm leading-snug line-clamp-1 ${tile("sm:text-[15px] sm:line-clamp-2")}`}>
          <GateLink href={ev.href} className="outline-none after:absolute after:inset-0 after:content-['']">
            {ev.omaOriginal && <OmaTitlePrefix title={ev.title} />}
            {ev.title}
          </GateLink>
        </h3>

        {/* Signale: Zustand, Dringlichkeit, Relevanz — nur was vom Normalfall abweicht */}
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {signal && (
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium ${tone.pill} ${ev.phase.phase === "live" ? (row ? "hidden" : "sm:hidden") : ""}`}>
              {ev.phase.phase === "period" && <Timer className="w-3 h-3" />}
              {signal}
            </span>
          )}
          {ev.urgency && <span className={`inline-flex items-center rounded px-1.5 py-px text-[11px] font-medium ${TONE_CLASSES.amber.pill}`}>{ev.urgency}</span>}
          {/* "Dein Spiel"/"Dein Squad" bewusst ohne Abzeichen — wirken nur auf Sortierung und Filter */}
          {ev.isRegistered && (
            <span className={`${tile("sm:hidden")} inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium ${past ? TONE_CLASSES.muted.pill : TONE_CLASSES.teal.pill}`}>
              <Check className="w-3 h-3" />{past ? "Mitgespielt" : "Dabei"}
            </span>
          )}
          {ev.kind && (
            <span
              title={ev.kind === "community" ? "Keine Platzierung — alle bekommen die Teilnahme-Belohnung" : "Mit Platzierung und Sieger"}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium ${ev.kind === "community" ? "bg-violet-500/15 text-violet-300" : "bg-amber-500/15 text-amber-300"}`}>
              <span aria-hidden>{EVENT_KIND_LABEL[ev.kind].emoji}</span>{EVENT_KIND_LABEL[ev.kind].label}
            </span>
          )}
          {ev.metaLine && <span className={`${row ? "inline" : "hidden sm:inline"} text-[11px] text-gray-500 truncate`}>{ev.metaLine}</span>}
        </div>

        {/* Belegung (nur Kachel) + Mitspieler */}
        {fillPct != null && !row && !past && (
          <div className="hidden sm:block h-1 rounded-full bg-line overflow-hidden mt-0.5">
            <div className={`h-full rounded-full ${ev.urgency?.startsWith("Noch") ? "bg-amber-400" : dimmed ? "bg-gray-500" : "bg-teal-400"}`} style={{ width: `${fillPct}%` }} />
          </div>
        )}
        {ev.avatars.length > 0 && (
          <div className={`${row ? "flex" : "hidden sm:flex"} items-center gap-2 min-w-0`}>
            <div className="relative z-10 shrink-0"><AvatarStack users={ev.avatars} max={3} size="xs" /></div>
            <span className="text-[11px] text-gray-500 truncate">
              {ev.friendNames.length > 0
                ? <><span className="text-gray-300">{ev.friendNames.join(", ")}</span>{othersCount > 0 && ` und ${othersCount} weitere`}</>
                : `${ev.playerCount} dabei`}
            </span>
          </div>
        )}

        {extra && <div className="relative z-10 flex items-center gap-1.5 flex-wrap min-w-0">{extra}</div>}

        {/* Fuß: Plätze + Münzen | Aktion */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="flex items-center gap-2 text-[11px] text-gray-400 tabular-nums min-w-0">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ev.playerCount}{ev.maxPlayers ? `/${ev.maxPlayers}` : ""}</span>
            {ev.coins > 0 && !past && <span className="flex items-center gap-0.5 font-semibold text-amber-400">+{ev.coins}<CoinIcon size={11} /></span>}
            {ev.comments && ev.comments.unread > 0 ? (
              <span className="flex items-center gap-1 rounded-full bg-teal-500/15 px-1.5 py-px font-semibold text-teal-300" title="Neue Nachrichten in den Absprachen">
                <MessageCircle className="w-3 h-3" />{ev.comments.unread} neu
              </span>
            ) : ev.comments && ev.comments.total > 0 ? (
              <span className="flex items-center gap-1" title="Nachrichten in den Absprachen"><MessageCircle className="w-3 h-3" />{ev.comments.total}</span>
            ) : null}
          </span>
          {actions && <div className="relative z-10 flex items-center gap-1.5 shrink-0">{actions}</div>}
        </div>
      </div>
    </article>
  );
}

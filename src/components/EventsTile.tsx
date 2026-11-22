import Link from "next/link";
import { isEventRunning } from "@/lib/event-display";
import type { ReactNode } from "react";
import GameCover from "@/components/GameCover";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import EventCoverDefault from "@/components/EventCoverDefault";
import { AvatarStack } from "@/components/AvatarStack";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import HubTile, { type HubRow } from "@/components/HubTile";
import RegisterButton from "@/app/(app)/(dashboard)/events/RegisterButton";
import { Clock, ExternalLink, Timer, Trophy } from "@/components/icons";
import { dateBlock, eventPhase, startsInLabel, urgencyHint } from "@/lib/event-display";
import { remainingLabel } from "@/lib/event-period";
import type { HomeEventCandidate, HomeFeature } from "@/lib/home-event-feature";
import { formatBerlinTime } from "@/lib/time";

interface Props {
  feature: HomeFeature;
  rows: HomeEventCandidate[];
  /** Laufende Zeitraum-Events (Woche/Monat) für die Zeile "läuft" — siehe runningPeriodEvents */
  periodEvents?: HomeEventCandidate[];
  weekCount: number;
  /** Server-"jetzt" als ISO-String (Countdown wird serverseitig berechnet) */
  nowIso: string;
  loggedIn: boolean;
}

const BTN = "shrink-0 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control px-4 text-sm font-bold transition-colors";
const BTN_PRIMARY = `${BTN} bg-primary text-primary-ink hover:bg-primary-hover`;
const BTN_VIOLET = `${BTN} bg-violet-500 text-white hover:bg-violet-400`;
const BTN_SECONDARY = `${BTN} border border-line-strong bg-surface-2 text-fg hover:bg-surface-3`;

function Pill({ tone, children }: { tone: "teal" | "red" | "violet" | "yellow"; children: ReactNode }) {
  const cls = {
    teal: "text-teal-300",
    red: "text-red-400",
    violet: "text-violet-300",
    yellow: "text-yellow-300",
  }[tone];
  return (
    <span className={`absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-canvas/90 px-2.5 py-1 text-xs font-bold shadow-card ${cls}`}>
      {children}
    </span>
  );
}

function Cover({ game, coverUrl, omaOriginal, dim = false }: { game: string | null; coverUrl: string | null; omaOriginal: boolean; dim?: boolean }) {
  return (
    <>
      {game || coverUrl
        ? <GameCover game={game} coverUrl={coverUrl} className="absolute inset-0 w-full h-full" rounded="rounded-none" brandBadge omaOriginal={omaOriginal}
            imgClassName="w-full h-full object-cover object-center" />
        : <EventCoverDefault className="absolute inset-0 w-full h-full" brandBadge omaOriginal={omaOriginal} />}
      {dim && <div className="absolute inset-0 bg-[#0b0d12]/60" />}
    </>
  );
}

function Avatars({ ev }: { ev: HomeEventCandidate }) {
  if (!ev.avatars.length) return null;
  return (
    <div className="absolute bottom-2.5 right-2.5 z-10">
      <AvatarStack users={ev.avatars} max={3} size="xs" />
    </div>
  );
}

/** Auf der Bühne groß und zweizeilig, sonst eine Zeile */
function Title({ title, omaOriginal, href, stage }: { title: string; omaOriginal: boolean; href: string; stage: boolean }) {
  return (
    <Link href={href} className={`block font-extrabold text-fg leading-tight hover:underline ${stage ? "line-clamp-2 text-base lg:text-2xl" : "truncate text-[15px]"}`}>
      {omaOriginal && <OmaTitlePrefix title={title} />}
      {title}
    </Link>
  );
}

/** "Heute · 20:00" / "Morgen · 20:00" / "Sa 21. · 20:00" */
const longDate = (d: Date, now: Date) => {
  const b = dateBlock(d, now);
  if (b.top === "HEUTE") return `Heute · ${b.time}`;
  if (b.top === "MORGEN") return `Morgen · ${b.time}`;
  return `${b.top.charAt(0)}${b.top.slice(1).toLowerCase()} ${b.day}. · ${b.time}`;
};

/**
 * Startseiten-Kachel "Events": zeigt das EINE Event, das für dich gerade am wichtigsten ist
 * (lib/home-event-feature.ts), darunter die nächsten zwei Events. Gerüst = HubTile, damit sie
 * neben der Clip-Kachel immer gleich hoch ist.
 */
export default function EventsTile({ feature, rows, periodEvents = [], weekCount, nowIso, loggedIn, stage = false }: Props & { stage?: boolean }) {
  const now = new Date(nowIso);
  let media: ReactNode;
  let main: ReactNode;
  let highlighted = false;

  if (feature.kind === "result" && feature.result.kind === "participation") {
    // Community-Event ohne Platzierung: "Du warst dabei" + Teilnahme-Belohnung + Mitspieler
    const r = feature.result;
    highlighted = true;
    media = (
      <>
        <Cover game={r.game} coverUrl={r.coverUrl} omaOriginal={r.omaOriginal} dim />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
          <span className="text-4xl drop-shadow-card" aria-hidden>🤝</span>
          <span className="text-lg font-black text-white drop-shadow-card">Du warst dabei!</span>
          {r.reward && (r.reward.coins > 0 || r.reward.rankPoints > 0) && (
            <span className="flex items-center gap-2 rounded-md bg-[#0b0d12]/85 px-2 py-1 text-xs font-semibold tabular-nums">
              {r.reward.coins > 0 && <span className="flex items-center gap-0.5 text-amber-300">+{r.reward.coins} <CoinIcon size={12} /></span>}
              {r.reward.rankPoints > 0 && <span className="flex items-center gap-0.5 text-teal-300">+{r.reward.rankPoints} <RankPointsIcon size={12} /></span>}
            </span>
          )}
          {r.pollWins.length > 0 && (
            <span className="flex max-w-[90%] items-center gap-1.5 rounded-md bg-[#0b0d12]/85 px-2 py-1 text-xs font-semibold text-violet-200">
              <Trophy className="w-3.5 h-3.5 shrink-0 text-violet-300" />
              <span className="truncate">Umfrage gewonnen: {r.pollWins.join(", ")}</span>
            </span>
          )}
        </div>
        <Pill tone="violet"><span aria-hidden>🤝</span> Ohne Platzierung</Pill>
        {r.avatars && r.avatars.length > 0 && (
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <AvatarStack users={r.avatars} max={5} size="xs" />
          </div>
        )}
      </>
    );
    main = (
      <>
        <div className="min-w-0 flex-1">
          <Title stage={stage} title={r.title} omaOriginal={r.omaOriginal} href={`/tournament/${r.id}`} />
          <p className="truncate text-xs text-muted lg:text-sm">Danke fürs Mitmachen · {r.total} dabei</p>
        </div>
        <Link href={`/tournament/${r.id}`} className={BTN_SECONDARY}>Ansehen</Link>
      </>
    );
  } else if (feature.kind === "result") {
    const r = feature.result;
    highlighted = true;
    media = (
      <>
        <Cover game={r.game} coverUrl={r.coverUrl} omaOriginal={r.omaOriginal} dim />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-yellow-300 drop-shadow-card tabular-nums">{r.place}.</span>
          <span className="text-xs font-semibold text-gray-200">von {r.total}</span>
          {r.pollWins.length > 0 && (
            <span className="mt-2 flex max-w-[90%] items-center gap-1.5 rounded-md bg-[#0b0d12]/85 px-2 py-1 text-xs font-semibold text-violet-200 shadow-card">
              <Trophy className="w-3.5 h-3.5 shrink-0 text-violet-300" />
              <span className="truncate">Umfrage gewonnen: {r.pollWins.join(", ")}</span>
            </span>
          )}
        </div>
        <Pill tone="yellow"><Trophy className="w-3.5 h-3.5" /> Dein Ergebnis</Pill>
      </>
    );
    main = (
      <>
        <div className="min-w-0 flex-1">
          <Title stage={stage} title={r.title} omaOriginal={r.omaOriginal} href={`/tournament/${r.id}`} />
          <p className="line-clamp-2 text-xs text-muted lg:text-sm">
            Platz {r.place} von {r.total}
            {r.winnerNames.length > 0 && (r.place === 1
              ? <> · Sieg geteilt mit <span className="text-yellow-300">{r.winnerNames.join(", ")}</span></>
              : <> · Sieg: <span className="text-yellow-300">{r.winnerNames.join(", ")}</span></>)}
          </p>
        </div>
        <Link href={`/tournament/${r.id}`} className={BTN_SECONDARY}>Ergebnisse</Link>
      </>
    );
  } else if (feature.kind === "none") {
    media = (
      <>
        <EventCoverDefault className="absolute inset-0 w-full h-full" brandBadge />
      </>
    );
    main = (
      <>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-white leading-tight">Gerade ist nichts geplant</p>
          <p className="truncate text-xs text-muted lg:text-sm">Hast du eine Idee? Schlag ein Event vor.</p>
        </div>
        <Link href="/events/verwalten/neu" className={BTN_SECONDARY}>Vorschlagen</Link>
      </>
    );
  } else {
    const ev = feature.ev;
    const href = `/tournament/${ev.id}`;
    const phase = eventPhase({ status: ev.status, startAt: ev.startAt, endAt: ev.endAt, maxPlayers: ev.maxPlayers, playerCount: ev.playerCount, isRegistered: ev.isRegistered }, now);
    const running = phase.phase === "live" || phase.phase === "period";
    // Zeitraum-Events stehen nur aus Anlass oben: frisch gestartet oder endet bald (home-event-feature.ts)
    const highlight = "highlight" in feature ? feature.highlight : undefined;
    const statusPill = running
      ? phase.phase === "period"
        ? highlight === "ending"
          ? <Pill tone="yellow"><Timer className="w-3.5 h-3.5" />Endet bald · {phase.label}</Pill>
          : highlight === "new"
            ? <Pill tone="teal"><Timer className="w-3.5 h-3.5" />Neu gestartet · {phase.label}</Pill>
            : <Pill tone="teal"><Timer className="w-3.5 h-3.5" />{phase.label}</Pill>
        : <Pill tone="red"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />Live</Pill>
      : null;
    const register = (label: string) => loggedIn && ev.canSelfRegister && !ev.isRegistered
      ? <RegisterButton eventId={ev.id} isRegistered={false} isFull={false} discordEventUrl={ev.discordUrl} joinLabel={label} coins={ev.coins} />
      : <Link href={href} className={BTN_SECONDARY}>Details</Link>;

    let pill: ReactNode = statusPill;
    let sub: ReactNode;
    let action: ReactNode;

    switch (feature.kind) {
      case "registered": {
        highlighted = true;
        const startsIn = startsInLabel(ev.startAt, now);
        pill = statusPill ?? <Pill tone="teal"><Clock className="w-3.5 h-3.5" />{startsIn ? `startet ${startsIn}` : "startet gleich"}</Pill>;
        sub = <>{running ? `${ev.playerCount} dabei` : longDate(ev.startAt, now)} · <span className="text-teal-300">du bist dabei</span></>;
        action = ev.discordUrl
          ? <a href={ev.discordUrl} target="_blank" rel="noopener noreferrer" className={BTN_PRIMARY}><ExternalLink className="w-3.5 h-3.5" />Discord</a>
          : <Link href={href} className={BTN_SECONDARY}>Details</Link>;
        break;
      }
      case "live":
        sub = <>{ev.playerCount} dabei{ev.friendNames.length > 0 && <> · <span className="text-gray-300">{ev.friendNames.join(", ")}</span></>}</>;
        action = register("Einsteigen");
        break;
      case "poll":
        highlighted = true;
        pill = <Pill tone="violet">Abstimmung läuft{ev.pollEndsAt && ` · bis ${formatBerlinTime(ev.pollEndsAt, { hour: "2-digit", minute: "2-digit" })}`}</Pill>;
        sub = <span className="text-violet-300">Deine Stimme fehlt noch</span>;
        action = <Link href={`${href}#abstimmung`} className={BTN_VIOLET}>Abstimmen</Link>;
        break;
      case "gamevote":
        pill = <Pill tone="violet">Spielwahl läuft</Pill>;
        sub = <>Wähl mit, was gespielt wird · {longDate(ev.startAt, now)}</>;
        action = <Link href={`${href}#spielwahl`} className={BTN_VIOLET}>Mitwählen</Link>;
        break;
      case "recommend": {
        const urgent = urgencyHint(ev, now);
        // "Dein Spiel"/"Dein Squad" ohne Abzeichen — wirken nur auf die Auswahl (recommendationScore)
        pill = <Pill tone="teal"><Clock className="w-3.5 h-3.5" />Als Nächstes</Pill>;
        sub = <>{longDate(ev.startAt, now)}{urgent ? <> · <span className="text-amber-300">{urgent}</span></> : ev.maxPlayers ? ` · ${ev.playerCount}/${ev.maxPlayers}` : ""}</>;
        action = register("Anmelden");
        break;
      }
    }

    media = (
      <>
        <Cover game={ev.game} coverUrl={ev.coverUrl} omaOriginal={ev.omaOriginal} />
        {pill}
        <Avatars ev={ev} />
      </>
    );
    main = (
      <>
        <div className="min-w-0 flex-1">
          <Title stage={stage} title={ev.title} omaOriginal={ev.omaOriginal} href={href} />
          <p className="truncate text-xs text-muted lg:text-sm">{sub}</p>
        </div>
        {action}
      </>
    );
  }

  // Laufende Zeitraum-Events (Woche/Monat) gebündelt in EINER Zeile statt fester Plätze
  const periodRow: HubRow | null = periodEvents.length > 0 ? (() => {
    const first = periodEvents[0];
    const left = first.endAt ? remainingLabel(first.endAt.getTime() - now.getTime()) : null;
    const multi = periodEvents.length > 1;
    const chipCls = "truncate rounded-md border border-line bg-line px-1.5 py-0.5";
    return {
      key: "period",
      // Ein Event: ganze Zeile führt hin. Mehrere: jeder Chip ist ein eigener Link zu seinem Event
      // (die Zeile selbst ist dann kein Link — sonst wären die Links verschachtelt).
      href: multi ? undefined : `/tournament/${first.id}`,
      lead: <span className="font-semibold text-teal-300">läuft</span>,
      // Jeder Name als eigener Chip — bei mehreren Events auf einen Blick getrennt (max. 2 + "+N")
      label: (
        <span className="flex items-center gap-1.5 min-w-0">
          {periodEvents.slice(0, 2).map(e => multi ? (
            <Link key={e.id} href={`/tournament/${e.id}`} title={e.title}
              className={`${chipCls} max-w-[48%] transition-colors hover:border-teal-400/40 hover:bg-teal-500/10 hover:text-white`}>
              {e.title}
            </Link>
          ) : (
            <span key={e.id} className={chipCls}>{e.title}</span>
          ))}
          {periodEvents.length > 2 && (
            <Link href="/events" className="shrink-0 text-gray-500 hover:text-gray-300" title="Alle laufenden Events">+{periodEvents.length - 2}</Link>
          )}
        </span>
      ),
      hint: <span className="text-gray-500">{periodEvents.length > 1 ? `${periodEvents.length} Events` : left}</span>,
    };
  })() : null;

  const hubRows: HubRow[] = [...(periodRow ? [periodRow] : []), ...rows.map(e => {
    const b = dateBlock(e.startAt, now);
    // Vor dem Start ausgelost (status "active") zählt noch nicht als "läuft"
    const running = isEventRunning(e, now);
    const urgent = urgencyHint(e, now);
    const full = !!e.maxPlayers && e.playerCount >= e.maxPlayers && !e.isRegistered;
    return {
      key: e.id,
      href: `/tournament/${e.id}`,
      lead: running ? <span className="font-bold text-red-400">LIVE</span> : b.top === "HEUTE" ? <span className="text-teal-300">{b.time}</span> : `${b.weekday} ${b.day}`,
      label: <>{e.omaOriginal && <OmaTitlePrefix title={e.title} />}{e.title}</>,
      hint: e.isRegistered
        ? <span className="text-teal-300">dabei</span>
        : full
          ? <span className="text-gray-500">voll</span>
          : urgent
            ? <span className="text-amber-300">{urgent.replace("Noch ", "").replace(" Plätze", " frei").replace(" Platz", " frei")}</span>
            : <span className="text-gray-500 tabular-nums">{e.playerCount}{e.maxPlayers ? `/${e.maxPlayers}` : ""}</span>,
    };
  })];

  return (
    <HubTile
      ariaLabel="Events"
      accent="teal"
      stage={stage}
      highlighted={highlighted}
      className="animate-slide-up stagger-1"
      media={media}
      main={main}
      rows={hubRows}
      placeholderRow={{ label: "Neues Event vorschlagen", href: "/events/verwalten/neu" }}
      footer={{ label: weekCount > 0 ? `${weekCount} ${weekCount === 1 ? "Event" : "Events"} diese Woche` : "Alle Events", href: "/events" }}
    />
  );
}

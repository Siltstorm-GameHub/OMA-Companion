import Link from "next/link";
import Image from "next/image";
import GameCover from "@/components/GameCover";
import { GateLink } from "@/components/GuestGate";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { ArrowDown, ArrowUp, Check, ChevronRight, Crown, Swords, Users } from "@/components/icons";
import { formatBerlinDate } from "@/lib/time";

/*
 * Module der Übersicht nach dem Designentwurf (OMA 2.0, docs/specs/00-design.md):
 * Bühne · dein laufendes Match · Event-Chat · kommende Events mit Cover · Rangliste (Balken) und Squads.
 * Alle Module zeigen nichts, wenn es nichts zu zeigen gibt — keine leeren Kästen.
 */

export const CARD = "rounded-card border border-line bg-surface";

export function ModuleHeader({ title, href, linkLabel = "Alle" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className="text-base font-extrabold text-fg">{title}</h2>
      {href && (
        <GateLink href={href} className="flex items-center gap-0.5 text-xs font-semibold text-primary-fg hover:text-fg">
          {linkLabel} <ChevronRight className="size-3.5" aria-hidden />
        </GateLink>
      )}
    </div>
  );
}

// ── Dein laufendes Match ─────────────────────────────────────────────

export type HomeMatch = {
  eventId: string;
  eventTitle: string;
  game: string | null;
  coverUrl: string | null;
  roundLabel: string;
  live: boolean;
  me: { name: string; image: string | null; score: number | null };
  opponent: { name: string; image: string | null; score: number | null };
};

function MatchSide({ p, align }: { p: HomeMatch["me"]; align: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {p.image ? (
        <Image src={p.image} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-sm font-bold text-muted">{p.name[0]?.toUpperCase()}</span>
      )}
      <span className="truncate text-sm font-bold text-fg">{p.name}</span>
    </div>
  );
}

/** Spielstand-Karte: dein offenes Match in einem laufenden Turnier. */
export function MyMatchModule({ match }: { match: HomeMatch }) {
  const hasScore = match.me.score != null && match.opponent.score != null;
  return (
    <section aria-label="Dein Match">
      <ModuleHeader title="Dein Match" href={`/tournament/${match.eventId}`} linkLabel="Zum Turnier" />
      <Link href={`/tournament/${match.eventId}`} className={`${CARD} card-hover block overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs">
          <Swords className="size-3.5 text-primary-fg" aria-hidden />
          <span className="truncate font-semibold text-muted">{match.eventTitle}</span>
          <span className="text-subtle">· {match.roundLabel}</span>
          {match.live && (
            <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-live-soft px-2 py-0.5 font-bold text-live">
              <span className="size-1.5 rounded-full bg-live" aria-hidden /> Läuft
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <MatchSide p={match.me} align="left" />
          <div className="shrink-0 rounded-control bg-surface-2 px-3 py-1.5 text-lg font-extrabold tabular-nums text-fg">
            {hasScore ? `${match.me.score} : ${match.opponent.score}` : "vs"}
          </div>
          <MatchSide p={match.opponent} align="right" />
        </div>
        <p className="border-t border-line px-4 py-2.5 text-xs font-semibold text-primary-fg">
          {hasScore ? "Ergebnis ansehen oder bestätigen" : "Ergebnis melden"} →
        </p>
      </Link>
    </section>
  );
}

// ── Kommende Events mit Cover ───────────────────────────────────────

export type HomeUpcoming = {
  id: string;
  title: string;
  game: string | null;
  coverUrl: string | null;
  omaOriginal: boolean;
  startAt: Date;
  startsIn: string | null;
  playerCount: number;
  maxPlayers: number | null;
  isRegistered: boolean;
};

export function UpcomingEventsModule({ events }: { events: HomeUpcoming[] }) {
  if (events.length === 0) return null;
  return (
    <section aria-label="Kommende Events">
      <ModuleHeader title="Kommende Events" href="/events" />
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        {events.map((ev) => (
          <GateLink
            key={ev.id}
            href={`/tournament/${ev.id}`}
            className={`${CARD} card-hover group flex w-60 shrink-0 snap-start flex-col overflow-hidden sm:w-auto`}
          >
            <div className="relative aspect-video overflow-hidden">
              <GameCover game={ev.game} coverUrl={ev.coverUrl} className="h-full w-full" rounded="rounded-none" brandBadge omaOriginal={ev.omaOriginal}
                imgClassName="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-primary-soft px-2.5 py-1 text-[0.6875rem] font-bold text-primary-fg">
                {formatBerlinDate(ev.startAt, { weekday: "short", day: "numeric", month: "short" })}
              </span>
              {ev.isRegistered && (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-canvas/90 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-fg">
                  <Check className="size-3" aria-hidden /> Dabei
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3.5">
              <p className="line-clamp-2 text-sm font-bold leading-snug text-fg">
                {ev.omaOriginal && <OmaTitlePrefix title={ev.title} />}{ev.title}
              </p>
              <p className="mt-auto flex items-center gap-2 text-xs text-subtle">
                {ev.startsIn && <span>{ev.startsIn}</span>}
                <span className="flex items-center gap-1"><Users className="size-3" aria-hidden />{ev.playerCount}{ev.maxPlayers ? `/${ev.maxPlayers}` : ""}</span>
              </p>
            </div>
          </GateLink>
        ))}
      </div>
    </section>
  );
}

// ── Rangliste (Balken) ──────────────────────────────────────────────

export type HomeRankRow = { id: string; name: string; image: string | null; rankPoints: number };

export function RankingModule({
  top, me, memberCount, trend, wanderpokal,
}: {
  top: HomeRankRow[];
  me: { rank: number; rankPoints: number } | null;
  memberCount: number;
  trend: "up" | "down" | "same";
  wanderpokal: { title: string; holders: string } | null;
}) {
  if (top.length === 0) return null;
  const max = Math.max(1, top[0].rankPoints);
  return (
    <section aria-label="Rangliste">
      <ModuleHeader title="Rangliste" href="/leaderboard" />
      <div className={`${CARD} p-4`}>
        <ol className="space-y-2.5">
          {top.map((u, i) => (
            <li key={u.id}>
              <GateLink href={`/profile/${u.id}`} className="group block">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-5 shrink-0 text-right font-extrabold tabular-nums ${i === 0 ? "text-coin" : "text-subtle"}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-fg group-hover:text-primary-fg">{u.name}</span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-muted">{u.rankPoints.toLocaleString("de-DE")}</span>
                </div>
                <div className="ml-7 mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className={`h-full rounded-full ${i === 0 ? "bg-coin" : "bg-primary"}`} style={{ width: `${Math.max(4, (u.rankPoints / max) * 100)}%` }} />
                </div>
              </GateLink>
            </li>
          ))}
        </ol>
        {me && (
          <Link href="/points" className="mt-3.5 flex items-center gap-2 rounded-control bg-surface-2 px-3 py-2 text-sm hover:bg-surface-3">
            <span className="font-semibold text-muted">Du</span>
            <span className="flex items-center gap-1 font-extrabold tabular-nums text-fg">
              #{me.rank}
              {trend === "up" && <ArrowUp className="size-3.5 text-success" aria-label="steigend" />}
              {trend === "down" && <ArrowDown className="size-3.5 text-danger" aria-label="fallend" />}
            </span>
            <span className="truncate text-xs text-subtle">von {memberCount}</span>
            <span className="ml-auto shrink-0 whitespace-nowrap font-bold tabular-nums text-primary-fg">{me.rankPoints.toLocaleString("de-DE")} Pts</span>
          </Link>
        )}
        {wanderpokal && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Crown className="size-3.5 shrink-0 text-coin" aria-hidden />
            <span className="min-w-0 truncate">
              Wanderpokal „{wanderpokal.title}“: <span className="font-semibold text-fg">{wanderpokal.holders}</span>
            </span>
          </p>
        )}
      </div>
    </section>
  );
}

// ── Squads ──────────────────────────────────────────────────────────

export type HomeSquad = { id: string; name: string; memberCount: number; mine: boolean };

export function SquadsModule({ squads }: { squads: HomeSquad[] }) {
  if (squads.length === 0) return null;
  const mine = squads.some((s) => s.mine);
  return (
    <section aria-label="Squads">
      <ModuleHeader title={mine ? "Deine Squads" : "Squads"} href="/squads" />
      <div className={`${CARD} divide-y divide-line overflow-hidden`}>
        {squads.map((s) => (
          <GateLink key={s.id} href={`/squads/${s.id}`} className="flex min-h-12 items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-soft text-sm font-extrabold text-primary-fg">
              {s.name[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{s.name}</span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-subtle"><Users className="size-3" aria-hidden />{s.memberCount}</span>
          </GateLink>
        ))}
      </div>
    </section>
  );
}

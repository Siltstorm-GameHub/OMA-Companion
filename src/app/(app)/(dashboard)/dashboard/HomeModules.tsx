import Link from "next/link";
import Image from "next/image";
import GameCover from "@/components/GameCover";
import { Podium } from "@/components/ui/Podium";
import CoinIcon from "@/components/CoinIcon";
import { GateLink } from "@/components/GuestGate";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { ArrowDown, ArrowUp, Check, Crown, Swords, Users } from "@/components/icons";
import { formatBerlinDate } from "@/lib/time";
import { SectionHeader } from "@/components/ui/SectionHeader";

/*
 * Module der Übersicht nach dem Designentwurf (OMA 2.0, docs/specs/00-design.md):
 * Bühne · dein laufendes Match · Event-Chat · kommende Events mit Cover · Rangliste (Balken) und Squads.
 * Alle Module zeigen nichts, wenn es nichts zu zeigen gibt — keine leeren Kästen.
 */

export const CARD = "rounded-card border border-line bg-surface";

/** Modul-Überschrift — gemeinsamer Baustein (components/ui/SectionHeader) */
export const ModuleHeader = SectionHeader;

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

function MatchAvatar({ p }: { p: HomeMatch["me"] }) {
  return p.image ? (
    <Image src={p.image} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-sm font-bold text-muted">{p.name[0]?.toUpperCase()}</span>
  );
}

/** Spielstand-Karte: dein offenes Match in einem laufenden Turnier — eine kompakte Zeile mit Aktion. */
export function MyMatchModule({ match }: { match: HomeMatch }) {
  const hasScore = match.me.score != null && match.opponent.score != null;
  const href = `/tournament/${match.eventId}`;
  return (
    <section aria-label="Dein Match">
      <ModuleHeader title="Dein Match" />
      <div className={`${CARD} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5`}>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Swords className="size-3.5 shrink-0 text-primary-fg" aria-hidden />
            <span className="truncate font-semibold">{match.eventTitle}</span>
            <span className="shrink-0 text-subtle">· {match.roundLabel}</span>
            {match.live && (
              <span className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-live-soft px-2 py-0.5 font-bold text-live">
                <span className="size-1.5 rounded-full bg-live" aria-hidden /> Läuft
              </span>
            )}
          </p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <MatchAvatar p={match.me} />
            <span className="min-w-0 truncate text-sm font-bold text-fg">{match.me.name}</span>
            <span className="shrink-0 rounded-control bg-surface-2 px-2.5 py-1 text-base font-extrabold tabular-nums text-fg">
              {hasScore ? `${match.me.score} : ${match.opponent.score}` : "vs"}
            </span>
            <span className="min-w-0 truncate text-right text-sm font-bold text-fg">{match.opponent.name}</span>
            <MatchAvatar p={match.opponent} />
          </div>
        </div>
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control bg-primary px-5 text-sm font-bold text-primary-ink hover:bg-primary-hover">
          {hasScore ? "Ergebnis bestätigen" : "Ergebnis melden"}
        </Link>
      </div>
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
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
        {events.map((ev) => (
          <GateLink
            key={ev.id}
            href={`/tournament/${ev.id}`}
            className={`${CARD} card-hover group flex w-64 shrink-0 snap-start flex-col overflow-hidden sm:w-auto`}
          >
            <div className="relative aspect-[2/1] overflow-hidden">
              <GameCover game={ev.game} coverUrl={ev.coverUrl} className="h-full w-full" rounded="rounded-none" brandBadge omaOriginal={ev.omaOriginal}
                imgClassName="h-full w-full object-cover" />
              <span className="absolute bottom-2 left-2 rounded-full bg-canvas/90 px-2.5 py-1 text-xs font-bold text-primary-fg">
                {formatBerlinDate(ev.startAt, { weekday: "short", day: "numeric", month: "short" })}
              </span>
              {ev.isRegistered && (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-canvas/90 px-2 py-0.5 text-xs font-semibold text-primary-fg">
                  <Check className="size-3" aria-hidden /> Dabei
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <p className="line-clamp-2 min-h-[2.6em] text-[15px] font-bold leading-snug text-fg">
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

// ── Rangliste: Podium für die Top 3, darunter kompakte Zeilen ──────

export type HomeRankRow = { id: string; name: string; image: string | null; rankPoints: number };


function RankAvatar({ u, size, ring }: { u: HomeRankRow; size: number; ring?: string }) {
  const cls = `shrink-0 rounded-full object-cover ${ring ? `ring-2 ${ring}` : ""}`;
  return u.image ? (
    <Image src={u.image} alt="" width={size} height={size} className={cls} style={{ width: size, height: size }} />
  ) : (
    <span className={`grid place-items-center bg-surface-3 font-bold text-muted ${cls}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {u.name[0]?.toUpperCase()}
    </span>
  );
}

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
  const rest = top.slice(3);
  return (
    <section aria-label="Rangliste">
      <ModuleHeader title="Rangliste" href="/leaderboard" />
      <div className={`${CARD} overflow-hidden`}>
        {/* Podium */}
        <Podium size="sm" className="px-3 pt-4"
          entries={top.slice(0, 3).map(u => ({
            id: u.id, name: u.name, image: u.image, href: `/profile/${u.id}`,
            avatar: (size: number) => <RankAvatar u={u} size={size} />,
            value: u.rankPoints.toLocaleString("de-DE"),
          }))} />
        {/* Plätze 4–5 */}
        {rest.length > 0 && (
          <ol className="divide-y divide-line border-t border-line">
            {rest.map((u, i) => (
              <li key={u.id}>
                <GateLink href={`/profile/${u.id}`} className="flex min-h-11 items-center gap-3 px-4 py-2 hover:bg-surface-2">
                  <span className="w-5 shrink-0 text-right text-sm font-extrabold tabular-nums text-subtle">{i + 4}</span>
                  <RankAvatar u={u} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{u.name}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">{u.rankPoints.toLocaleString("de-DE")}</span>
                </GateLink>
              </li>
            ))}
          </ol>
        )}
        {(me || wanderpokal) && (
          <div className="space-y-2.5 border-t border-line p-3">
            {me && (
              <Link href="/points" className="flex items-center gap-2 rounded-control bg-primary-soft px-3 py-2 text-sm hover:bg-primary-soft/80">
                <span className="font-semibold text-primary-fg">Du</span>
                <span className="flex items-center gap-1 font-extrabold tabular-nums text-fg">
                  #{me.rank}
                  {trend === "up" && <ArrowUp className="size-3.5 text-success" aria-label="steigend" />}
                  {trend === "down" && <ArrowDown className="size-3.5 text-danger" aria-label="fallend" />}
                </span>
                <span className="truncate text-xs text-muted">von {memberCount}</span>
                <span className="ml-auto shrink-0 whitespace-nowrap font-bold tabular-nums text-primary-fg">{me.rankPoints.toLocaleString("de-DE")} Pts</span>
              </Link>
            )}
            {wanderpokal && (
              <p className="flex items-center gap-2 px-1 text-xs text-muted">
                <Crown className="size-3.5 shrink-0 text-coin" aria-hidden />
                <span className="min-w-0 truncate">
                  Wanderpokal „{wanderpokal.title}“: <span className="font-semibold text-fg">{wanderpokal.holders}</span>
                </span>
              </p>
            )}
          </div>
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

// ── Deine Reihen ────────────────────────────────────────────────────

export type HomeSeriesRow = {
  id: string;
  name: string;
  color: string;
  game: string | null;
  coverUrl: string | null;
  omaOriginal: boolean;
  /** "läuft gerade" / "nächster Termin in 2 Tagen" / "keine Termine geplant" */
  status: { kind: "live" | "next" | "none"; label: string };
  registered: boolean;
  /** eigener Platz in der Tabelle (0 = keiner) */
  place: number;
  leaderName: string | null;
};

export function SeriesModule({ rows, mine }: { rows: HomeSeriesRow[]; mine: boolean }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label="Eventreihen">
      <ModuleHeader title={mine ? "Deine Reihen" : "Eventreihen"} href="/events" />
      <div className={`${CARD} divide-y divide-line overflow-hidden`}>
        {rows.map((s) => (
          <GateLink key={s.id} href={`/events/series/${s.id}`} className="relative flex min-h-14 items-center gap-3 py-2.5 pl-4 pr-4 hover:bg-surface-2">
            <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full" style={{ background: s.color }} aria-hidden />
            <GameCover game={s.game} coverUrl={s.coverUrl} className="size-10 shrink-0" rounded="rounded-control" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold" style={{ color: s.color }}>
                {s.omaOriginal && <OmaTitlePrefix title={s.name} />}{s.name}
              </span>
              <span className="block truncate text-xs text-muted">
                {s.status.kind === "live" ? <span className="text-live">{s.status.label}</span> : s.status.label}
                {s.registered && <span className="text-primary-fg"> · dabei</span>}
                {!s.place && s.leaderName && <> · <Crown className="inline size-3 text-coin" aria-hidden /> {s.leaderName}</>}
              </span>
            </span>
            {s.place > 0 && (
              <span className={`shrink-0 text-sm font-extrabold tabular-nums ${s.place === 1 ? "text-coin" : "text-primary-fg"}`}>Platz {s.place}</span>
            )}
          </GateLink>
        ))}
      </div>
    </section>
  );
}

// ── Quests ──────────────────────────────────────────────────────────

export type HomeQuest = { id: string; title: string; current: number; target: number; reward: number };

export function QuestsModule({
  done, total, coinsEarned, monthEndsIn, quests,
}: { done: number; total: number; coinsEarned: number; monthEndsIn: string | null; quests: HomeQuest[] }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <section aria-label="Quests">
      <ModuleHeader title="Quests" href="/quests" />
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex justify-between gap-2 text-xs text-muted">
              <span>{done} von {total} erledigt{monthEndsIn && <> · Monat endet {monthEndsIn}</>}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums text-coin" title="Diesen Monat mit Quests verdient">
            {coinsEarned.toLocaleString("de-DE")} <CoinIcon size={14} />
          </span>
        </div>
        {quests.length === 0 ? (
          <p className="px-4 py-3.5 text-sm text-muted">Alle Quests erledigt. Stark!</p>
        ) : quests.map((q) => {
          const p = q.target ? Math.min(100, Math.round((q.current / q.target) * 100)) : 0;
          return (
            <Link key={q.id} href="/quests" className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-surface-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{q.title}</span>
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-primary/70" style={{ width: `${p}%` }} />
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-subtle">{q.current}/{q.target}</span>
              <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold tabular-nums text-coin">+{q.reward}<CoinIcon size={12} /></span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

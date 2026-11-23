import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Podium } from "@/components/ui/Podium";
import { RankCell } from "@/components/ui/Table";
import { HeartColor as Heart } from "@/components/icons-color";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getSessionUser } from "@/lib/roles";
import RankedAvatar from "@/components/RankedAvatar";
import { calcStreak } from "@/lib/streak";
import { TrendingUp, TrendingDown, Minus } from "@/components/icons";
import BotPreviewShell from "@/components/BotPreviewShell";
import { GateLink, GuestMoreCta } from "@/components/GuestGate";
import { GUEST_LEADERBOARD_LIMIT } from "@/lib/guest-access";
import WanderpocalBadgeServer from "@/components/WanderpocalBadgeServer";
import { getWanderpocalHoldersMap } from "@/lib/get-wanderpocal-holders";
import { headers } from "next/headers";
import { isLinkPreviewBot } from "@/lib/link-preview-bots";
import { parseEquipped, resolveLook } from "@/lib/cosmetics/catalog";
import { CosmeticName, CosmeticTitle } from "@/components/cosmetics/CosmeticName";
import { RANK_PREFIX } from "@/lib/points";
import { fromDatetimeLocalBerlin, getBerlinDateParts } from "@/lib/time";
import { monthlyRanking, myStanding, overallRanking, rankDelta, windowAround, type RankEntry } from "@/lib/leaderboard";
import PointsInfoModal from "../profile/PointsInfoModal";

const LIST_SIZE = 50;

// Event-Siege je Nutzer: lädt und parst die completionData ALLER abgeschlossenen Events — teuer
// und für alle Besucher gleich, daher 5 min gecacht (Tag "dashboard-global" wird beim
// Abschließen von Serien bereits invalidiert). Rückgabe als Entry-Array, weil unstable_cache
// JSON serialisiert (eine Map ginge verloren).
const getEventWinCounts = unstable_cache(
  async (): Promise<[string, number][]> => {
    const events = await prisma.event.findMany({
      where: { completionData: { not: null } },
      select: { completionData: true },
    });
    const winMap = new Map<string, number>();
    for (const ev of events) {
      try {
        const data = JSON.parse(ev.completionData!);
        const winners: string[] =
          data.eventWinnerIds ??
          (data.eventWinnerId ? [data.eventWinnerId] : null) ??
          data.finalRankingGroups?.[0] ??
          (data.finalRanking?.[0] ? [data.finalRanking[0]] : []);
        for (const uid of winners) {
          winMap.set(uid, (winMap.get(uid) ?? 0) + 1);
        }
      } catch { /* skip malformed JSON */ }
    }
    return Array.from(winMap.entries());
  },
  ["leaderboard-event-wins"],
  { revalidate: 300, tags: ["dashboard-global"] },
);

// Rang-Punkte aller Mitglieder + Rang-Punkte-Buchungen dieses Monats (für Monatswertung und
// Trend). Für alle Besucher gleich → kurz gecacht. Arrays statt Maps (JSON-Serialisierung).
const getRankData = unstable_cache(
  async (monthStartIso: string): Promise<{ users: [string, number][]; gains: [string, number][] }> => {
    const [users, gains] = await Promise.all([
      prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, rankPoints: true } }),
      prisma.pointTransaction.groupBy({
        by: ["userId"],
        where: { reason: { startsWith: RANK_PREFIX }, createdAt: { gte: new Date(monthStartIso) } },
        _sum: { amount: true },
      }),
    ]);
    return {
      users: users.map(u => [u.id, u.rankPoints ?? 0]),
      gains: gains.map(g => [g.userId, g._sum.amount ?? 0]),
    };
  },
  ["leaderboard-rank-data"],
  { revalidate: 60, tags: ["dashboard-global"] },
);

function RankDeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="w-6" />;
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 leading-none" title={`${delta} Plätze hoch seit Monatsbeginn`}>
        <TrendingUp className="w-3 h-3" />{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-red-400 leading-none" title={`${-delta} Plätze runter seit Monatsbeginn`}>
        <TrendingDown className="w-3 h-3" />{Math.abs(delta)}
      </span>
    );
  }
  return <Minus className="w-3 h-3 text-gray-700" />;
}

export const metadata: Metadata = {
  title: "Rangliste – Old Masters Ally",
  description: "Tritt gegen die Community an und kämpfe um die Spitze.",
  openGraph: { images: ["/api/og/leaderboard"] },
  twitter: { card: "summary_large_image", images: ["/api/og/leaderboard"] },
};

type View = "gesamt" | "monat";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ zeitraum?: string }> }) {
  const me = await getSessionUser();
  if (!me) {
    // Ohne Session kommt entweder ein von (dashboard)/layout.tsx bereits
    // geprüfter Link-Vorschau-Bot hierher (braucht nur die Meta-Tags, keine
    // teure Zusammenstellung unten) oder ein echter, nicht eingeloggter
    // Besucher — die Rangliste ist bewusst öffentlich einsehbar, nur eigene
    // Rang-Badges und Profil-Links bleiben hinter dem Login.
    const ua = (await headers()).get("user-agent");
    if (isLinkPreviewBot(ua)) return <BotPreviewShell />;
  }
  const userId = me?.id;
  const view: View = (await searchParams).zeitraum === "monat" ? "monat" : "gesamt";

  const now = new Date();
  const { year, month } = getBerlinDateParts(now);
  const monthStart = fromDatetimeLocalBerlin(`${year}-${String(month).padStart(2, "0")}-01T00:00`);
  const monthName = new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "Europe/Berlin" }).format(now);

  const [rankData, eventWinCounts, donationGroups, holdersMap] = await Promise.all([
    getRankData(monthStart.toISOString()),
    getEventWinCounts(),
    prisma.donation.groupBy({
      by: ["userId", "month", "year"],
      orderBy: [{ userId: "asc" }, { year: "desc" }, { month: "desc" }],
    }),
    getWanderpocalHoldersMap(),
  ]);

  const gains = new Map(rankData.gains);
  const overall = overallRanking(rankData.users.map(([id, points]) => ({ id, points })), gains);
  const entries: RankEntry[] = view === "monat" ? monthlyRanking(gains) : overall;

  // Gäste sehen nur die Top-Plätze als Vorgeschmack, die volle Liste gibt es nach dem Login.
  const listSize = userId ? LIST_SIZE : GUEST_LEADERBOARD_LIMIT;
  const shown = entries.slice(0, listSize);
  const podium = shown.length >= 3 ? shown.slice(0, 3) : [];
  const rest = podium.length ? shown.slice(3) : shown;

  const mine = myStanding(entries, userId);
  const mineOverall = view === "monat" ? myStanding(overall, userId) : mine;
  const myWindow = mine && mine.index >= listSize ? windowAround(entries, mine.index, 1) : [];

  // Details nur für die angezeigten Personen (+ Nachbarn für "Dein Stand")
  const ids = [...new Set([
    ...shown.map(e => e.id), ...myWindow.map(e => e.id),
    ...(mine?.above ? [mine.above.id] : []),
  ])];
  const people = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, username: true, image: true, equippedCosmeticsJson: true, reputationPeakLevel: true },
      })
    : [];
  const personOf = new Map(people.map(p => [p.id, p]));
  const looks = new Map(people.map(u => [u.id, resolveLook(parseEquipped(u.equippedCosmeticsJson), u.reputationPeakLevel)]));
  const nameOf = (id: string) => { const p = personOf.get(id); return p?.username ?? p?.name ?? "Unbekannt"; };

  const winMap = new Map<string, number>(eventWinCounts);
  const donationsByUser = new Map<string, { month: number; year: number }[]>();
  for (const d of donationGroups) {
    if (!donationsByUser.has(d.userId)) donationsByUser.set(d.userId, []);
    donationsByUser.get(d.userId)!.push({ month: d.month, year: d.year });
  }
  const streakMap = new Map(Array.from(donationsByUser.entries()).map(([uid, list]) => [uid, calcStreak(list)]));

  const pointsLabel = view === "monat" ? `Punkte im ${monthName}` : "Punkte";
  const fmt = (n: number) => n.toLocaleString("de-DE");

  const row = (e: RankEntry, opts: { highlight?: boolean } = {}) => {
    const p = personOf.get(e.id);
    if (!p) return null;
    const isMe = e.id === userId;
    const wins = winMap.get(e.id) ?? 0;
    const streak = streakMap.get(e.id) ?? 0;
    const name = p.username ?? p.name ?? "Unbekannt";
    return (
      <GateLink key={e.id} href={isMe ? "/profile" : `/profile/${e.id}`}
        className={`grid min-h-14 items-center gap-x-3 px-3 sm:px-4 py-2 transition-colors [grid-template-columns:2rem_1.75rem_2.5rem_1fr_auto] ${
          isMe || opts.highlight ? "bg-primary-soft/70" : "hover:bg-surface-2"
        }`}>
        <span className="flex justify-center"><RankCell rank={e.rank} /></span>
        <span className="flex justify-center">{view === "gesamt" ? <RankDeltaBadge delta={rankDelta(e)} /> : <span />}</span>
        <RankedAvatar userId={e.id} look={looks.get(e.id)} src={p.image} alt={name} size={40} rounded="full" className="w-10 h-10" />
        <div className="min-w-0">
          <p className={`text-sm font-bold truncate leading-tight ${isMe ? "text-primary-fg" : "text-fg"}`}>
            <CosmeticName nameColor={looks.get(e.id)?.nameColor}>{name}</CosmeticName>
            <WanderpocalBadgeServer userId={e.id} holdersMap={holdersMap} />
            {isMe && <span className="text-xs text-gray-500 ml-1 font-normal">du</span>}
          </p>
          <p className="flex items-center gap-2 text-xs text-gray-500 leading-tight mt-0.5 min-w-0">
            {wins > 0 && <span className="shrink-0">{wins} {wins === 1 ? "Sieg" : "Siege"}</span>}
            {streak > 0 && (
              <span className="flex items-center gap-0.5 text-pink-400 shrink-0" title={`${streak} Monate in Folge unterstützt`}>
                <Heart className="w-3 h-3" />{streak}
              </span>
            )}
            <CosmeticTitle title={looks.get(e.id)?.title} className="truncate" />
          </p>
        </div>
        <span className={`text-sm font-extrabold tabular-nums text-right ${isMe ? "text-primary-fg" : "text-fg"}`}>{fmt(e.points)}</span>
      </GateLink>
    );
  };


  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-5 animate-fade-in">

      {/* ── Kopf ── */}
      <PageHeader
        title="Rangliste"
        description={view === "monat"
          ? `Wer im ${monthName} die meisten Rang-Punkte geholt hat · ${entries.length} dabei`
          : `${fmt(entries.length)} Mitglieder · nach Rang-Punkten`}
      />

      {/* ── Dein Stand ── */}
      {userId && (
        <section aria-label="Dein Stand" className="rounded-card border border-primary/40 bg-surface p-4 sm:p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          {mine ? (
            <>
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Dein Stand</p>
                <p className="text-xl font-extrabold text-white tabular-nums leading-tight mt-0.5">
                  Platz {mine.entry.rank} <span className="text-sm font-normal text-gray-500">von {fmt(mine.total)}</span>
                  {view === "gesamt" && (() => {
                    const d = rankDelta(mine.entry);
                    return d ? <span className={`ml-2 text-xs font-semibold ${d > 0 ? "text-emerald-400" : "text-red-400"}`}>{d > 0 ? "▲" : "▼"} {Math.abs(d)} seit 1. {monthName.slice(0, 3)}.</span> : null;
                  })()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {mine.above
                    ? <><span className="text-primary-fg font-semibold">{fmt(mine.above.gap)} {mine.above.gap === 1 ? "Punkt" : "Punkte"}</span> bis Platz {entries.find(x => x.id === mine.above!.id)?.rank} ({nameOf(mine.above.id)})</>
                    : <span className="text-yellow-300 font-semibold">Du stehst ganz oben</span>}
                  {mine.below && <> · {fmt(mine.below.lead)} Vorsprung auf den nächsten Platz</>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-primary-fg tabular-nums leading-none">{fmt(mine.entry.points)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {view === "monat" ? pointsLabel : <>Punkte{(mineOverall?.entry.gain ?? 0) > 0 && <> · +{fmt(mineOverall!.entry.gain)} im {monthName}</>}</>}
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Dein Stand</p>
              <p className="text-sm text-gray-300 mt-1">
                {view === "monat"
                  ? `Du hast im ${monthName} noch keine Rang-Punkte. Eine Turnierplatzierung bringt dich in die Monatswertung.`
                  : "Du hast noch keine Rang-Punkte. Eine Turnierplatzierung bringt dich in die Rangliste."}
              </p>
            </div>
          )}
          <PointsInfoModal />
        </section>
      )}

      {/* ── Zeitraum ── */}
      <nav aria-label="Zeitraum" className="flex items-center gap-1.5">
        {([["gesamt", "Gesamt"], ["monat", `Diesen Monat`]] as const).map(([key, label]) => (
          <Link key={key} href={key === "gesamt" ? "/leaderboard" : "/leaderboard?zeitraum=monat"} aria-current={view === key ? "page" : undefined}
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${
              view === key ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-gray-300 hover:border-line-strong hover:bg-surface-2"
            }`}>
            {label}
          </Link>
        ))}
        {view === "gesamt" && <span className="ml-auto hidden text-xs text-subtle sm:inline">Pfeile: Veränderung seit 1. {monthName}</span>}
      </nav>

      {entries.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-sm text-gray-400">
          {view === "monat" ? `Im ${monthName} hat noch niemand Rang-Punkte geholt.` : "Noch keine Rang-Punkte vergeben."}
        </div>
      )}

      {/* ── Podest ── */}
      {podium.length === 3 && (
        <Podium size="lg" className="rounded-card border border-line bg-surface px-3 pt-6 sm:px-6"
          entries={podium.flatMap(e => {
            const p = personOf.get(e.id);
            if (!p) return [];
            const name = p.username ?? p.name ?? "?";
            return [{
              id: e.id, name, image: p.image, isMe: e.id === userId,
              href: e.id === userId ? "/profile" : `/profile/${e.id}`,
              avatar: (size: number) => <RankedAvatar userId={e.id} look={looks.get(e.id)} src={p.image} alt={name} size={size} rounded="full" />,
              nameNode: <><CosmeticName nameColor={looks.get(e.id)?.nameColor}>{name}</CosmeticName><WanderpocalBadgeServer userId={e.id} holdersMap={holdersMap} /></>,
              value: <span className="text-sm">{fmt(e.points)}</span>,
              below: view === "gesamt" ? <span className="mt-1 h-4"><RankDeltaBadge delta={rankDelta(e)} /></span> : undefined,
            }];
          })} />
      )}

      {/* ── Liste ab Platz 4 + dein Ausschnitt ── */}
      {(rest.length > 0 || myWindow.length > 0) && (
        <div className="rounded-card border border-line bg-surface overflow-hidden shadow-card">
          <div className="grid items-center gap-x-3 px-3 sm:px-4 py-2.5 bg-surface-2 text-xs font-bold text-subtle uppercase tracking-[0.06em] border-b border-line [grid-template-columns:2rem_1.75rem_2.5rem_1fr_auto]">
            <span className="text-center">#</span><span /><span /><span>Mitglied</span><span className="text-right">{pointsLabel}</span>
          </div>
          <div className="divide-y divide-line">
            {rest.map(e => row(e))}
          </div>
          {myWindow.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-center text-xs text-gray-600 border-y border-dashed border-line">
                ⋯ dein Ausschnitt ⋯
              </div>
              <div className="divide-y divide-line">
                {myWindow.map(e => row(e))}
              </div>
            </>
          )}
        </div>
      )}

      <GuestMoreCta message={`Die komplette Rangliste gibt's nach dem Login`} />

      {/* Deine Position bleibt beim Scrollen sichtbar (über der unteren Leiste am Handy) */}
      {mine && (
        <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-4 z-20 flex items-center gap-3 rounded-card border border-primary/40 bg-sidebar px-4 py-2.5 shadow-pop">
          <RankCell rank={mine.entry.rank} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-fg">
            Du · Platz {mine.entry.rank}
            {mine.above && <span className="font-normal text-muted"> · {fmt(mine.above.gap)} bis Platz {entries.find(x => x.id === mine.above!.id)?.rank}</span>}
          </span>
          <span className="shrink-0 text-sm font-extrabold tabular-nums text-primary-fg">{fmt(mine.entry.points)}</span>
        </div>
      )}
    </div>
  );
}

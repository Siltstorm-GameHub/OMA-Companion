import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { COIN_PREFIX, POINT_RULES, reasonVariants } from "@/lib/points";
import { PROFILE_COMPLETION_ITEMS } from "@/lib/profile-completion";
import { spinDateKey } from "@/lib/daily-spin";
import { formatBerlinDate, getBerlinDateParts } from "@/lib/time";
import {
  SOURCE_LABELS, discordDailyMax, discordReasons, groupLedgerByDay, weekSummary, type Currency,
} from "@/lib/coin-ledger";
import CoinIcon from "@/components/CoinIcon";
import { DayBlock, SourceRow, type CoinSourceRow } from "@/components/coins/CoinParts";
import RankPointsIcon from "@/components/RankPointsIcon";
import { CountUp } from "@/components/CountUp";
import {
  CalendarDays, ChevronDown, Clapperboard, Dices, MessageCircle, ShoppingBag, Target, UserCheck, Users,
} from "@/components/icons";

export const metadata = { title: "Münzen | OMA" };

const DAYS_VISIBLE = 7;
const FILTERS: { key: "alle" | "muenzen" | "rang"; label: string; only?: Currency }[] = [
  { key: "alle", label: "Alle" },
  { key: "muenzen", label: "Münzen", only: "coins" },
  { key: "rang", label: "Rang-Punkte", only: "rank" },
];

const fmt = (n: number) => n.toLocaleString("de-DE");
/** Sichtbare Events (wie auf der Quests-Seite): nicht versteckt, Eventreihe nicht versteckt */
const visibleEvent = { hidden: false, OR: [{ seriesId: null }, { series: { hidden: false } }] };

/**
 * Münzen (/points): Kontostand mit Wochenbilanz, woher Münzen kommen (mit deinem persönlichen
 * Stand je Quelle) und der Verlauf nach Tagen. Rang-Punkte gibt es nur für Platzierungen.
 */
export default async function PointsPage({ searchParams }: { searchParams: Promise<{ waehrung?: string }> }) {
  const me = await getSessionUser();
  if (!me) redirect("/login?notice=login_required&callbackUrl=/points");
  const userId = me.id;
  const { waehrung } = await searchParams;
  const filter = FILTERS.find((f) => f.key === waehrung) ?? FILTERS[0];

  const now = new Date();
  const { month, year } = getBerlinDateParts(now);
  // Wie awardPoints: Tages-Caps zählen ab lokaler Mitternacht
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const profileReasons = PROFILE_COMPLETION_ITEMS.flatMap((i) => reasonVariants(COIN_PREFIX, POINT_RULES[i.rule].reason));

  const [user, txs, quests, discordToday, spunToday, clipContest, profileTxs, nextEvent] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true, rankPoints: true } }),
    prisma.pointTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 250 }),
    prisma.quest.findMany({ where: { month, year }, select: { reward: true, progress: { where: { userId }, select: { completed: true } } } }),
    prisma.pointTransaction.aggregate({ where: { userId, reason: { in: discordReasons() }, createdAt: { gte: todayStart } }, _sum: { amount: true } }),
    prisma.dailySpin.findUnique({ where: { userId_date: { userId, date: spinDateKey() } }, select: { id: true } }).then(Boolean).catch(() => false),
    prisma.monthlyClipContest.findFirst({
      where: { status: "voting" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { participationCoins: true, rewardCoins: true, votes: { where: { userId }, select: { id: true } } },
    }),
    prisma.pointTransaction.findMany({ where: { userId, reason: { in: profileReasons } }, select: { reason: true } }),
    prisma.event.findFirst({
      where: { ...visibleEvent, status: "open", startAt: { gt: now }, registrations: { none: { userId } } },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, startAt: true },
    }),
  ]);

  const coins = user?.points ?? 0;
  const rankPoints = user?.rankPoints ?? 0;
  const week = weekSummary(txs, now);

  const openQuests = quests.filter((q) => !q.progress[0]?.completed);
  const questOpenCoins = openQuests.reduce((s, q) => s + q.reward, 0);
  const discordMax = discordDailyMax();
  const discordEarned = Math.min(discordToday._sum.amount ?? 0, discordMax);
  const profileDone = PROFILE_COMPLETION_ITEMS.filter((i) => {
    const variants = reasonVariants(COIN_PREFIX, POINT_RULES[i.rule].reason);
    return profileTxs.some((t) => variants.includes(t.reason));
  });
  const profileOpenCoins = PROFILE_COMPLETION_ITEMS.filter((i) => !profileDone.includes(i)).reduce((s, i) => s + POINT_RULES[i.rule].amount, 0);
  const voted = (clipContest?.votes.length ?? 0) > 0;

  const sources: CoinSourceRow[] = [
    {
      key: "events", icon: <CalendarDays className="w-4 h-4" />, title: "Events mitspielen", href: nextEvent ? `/tournament/${nextEvent.id}` : "/events",
      hint: nextEvent
        ? <>Nächstes: {nextEvent.title}, {formatBerlinDate(nextEvent.startAt, { weekday: "short", day: "numeric", month: "numeric" })}</>
        : "Teilnahme und Bonus für Platz 1–3 stehen auf jedem Event",
      value: "je Event",
    },
    {
      key: "quests", icon: <Target className="w-4 h-4" />, title: "Quests", href: "/quests", done: quests.length > 0 && openQuests.length === 0,
      hint: quests.length === 0 ? "Neue Quests zum Monatsstart" : openQuests.length === 0 ? "Diesen Monat alle erledigt" : `${openQuests.length} offen diesen Monat`,
      value: openQuests.length > 0 ? `bis ${fmt(questOpenCoins)}` : "erledigt",
    },
    {
      key: "discord", icon: <MessageCircle className="w-4 h-4" />, title: "Discord: Voice und Chat", href: "/quests", done: discordEarned >= discordMax,
      hint: `Heute ${fmt(discordEarned)} von ${fmt(discordMax)} möglich`,
      value: `bis ${fmt(discordMax)}/Tag`,
    },
    {
      key: "clips", icon: <Clapperboard className="w-4 h-4" />, title: "Clips: abstimmen und gewinnen", href: "/clip-des-monats", done: !!clipContest && voted,
      hint: clipContest ? (voted ? "Diesen Monat schon abgestimmt" : "Abstimmung läuft gerade") : "Abstimmung startet zum Monatsanfang",
      value: clipContest ? `+${fmt(clipContest.participationCoins)} / +${fmt(clipContest.rewardCoins)}` : "monatlich",
    },
    {
      key: "spin", icon: <Dices className="w-4 h-4" />, title: "Glücksrad", href: "/shop#gluecksrad", done: spunToday,
      hint: spunToday ? "Heute schon gedreht, morgen wieder" : "Heute noch nicht gedreht",
      value: "täglich",
    },
    {
      key: "profile", icon: <UserCheck className="w-4 h-4" />, title: "Profil vervollständigen", href: "/profile", done: profileOpenCoins === 0,
      hint: `${profileDone.length} von ${PROFILE_COMPLETION_ITEMS.length} erledigt`,
      value: profileOpenCoins > 0 ? `${fmt(profileOpenCoins)} offen` : "erledigt",
    },
  ];
  // Offenes zuerst, Erledigtes nach unten
  sources.sort((a, b) => Number(!!a.done) - Number(!!b.done));

  const days = groupLedgerByDay(txs, now, filter.only);
  const visibleDays = days.slice(0, DAYS_VISIBLE);
  const olderDays = days.slice(DAYS_VISIBLE);

  return (
    <div className="px-4 pb-8 pt-0 sm:p-6 max-w-6xl mx-auto space-y-4 animate-fade-in">
      {/* ── Kontostand ── */}
      <section aria-label="Kontostand" className="glass rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        <div className="relative grid grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto] gap-4 items-center">
          <div>
            <h1 className="text-[11px] font-semibold text-gray-500">Deine Münzen</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-3xl font-black text-amber-300 tabular-nums">
              <CoinIcon size={24} /> <CountUp to={coins} duration={900} />
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500">Diese Woche</p>
            <p className="mt-0.5 text-xl font-bold text-white tabular-nums">+{fmt(week.earned)}</p>
            <p className="text-[11px] text-gray-500 truncate">
              {week.topSources.length > 0 ? `meist aus ${week.topSources.map((s) => SOURCE_LABELS[s]).join(" und ")}` : "seit Montag"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500">Rang-Punkte</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xl font-bold text-teal-300 tabular-nums"><RankPointsIcon size={16} /> {fmt(rankPoints)}</p>
            <p className="text-[11px] text-gray-500">nur für Platzierungen, zählen für die <Link href="/leaderboard" className="text-teal-400 hover:text-teal-300">Rangliste</Link></p>
          </div>
          <Link href="/shop"
            className="col-span-2 lg:col-span-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/25 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors">
            <ShoppingBag className="w-4 h-4" /> Zum Shop
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 items-start">
        {/* ── Quellen ── */}
        <section aria-label="So verdienst du Münzen" className="glass rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-white">So verdienst du Münzen</h2>
          <p className="text-[11px] text-gray-500">Mit deinem Stand für heute und diesen Monat.</p>
          <ul className="mt-2">{sources.map((s) => <SourceRow key={s.key} s={s} />)}</ul>
          <p className="mt-3 flex gap-1.5 border-t border-line pt-3 text-[11px] text-gray-500 leading-relaxed">
            <Users className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Außerdem: Spielwahl, Umfragen und Sieger-Tipps bei Events, Community-Ziele, {fmt(POINT_RULES.INVITE_MEMBER.amount)} fürs Einladen
              neuer Mitglieder. An deinem Geburtstag gibt es doppelte Münzen.
            </span>
          </p>
        </section>

        {/* ── Verlauf ── */}
        <section aria-label="Verlauf" className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-white">Verlauf</h2>
            <nav aria-label="Währung" className="flex gap-1">
              {FILTERS.map((f) => (
                <Link key={f.key} href={f.key === "alle" ? "/points" : `/points?waehrung=${f.key}`} scroll={false}
                  aria-current={f.key === filter.key ? "true" : undefined}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    f.key === filter.key ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25" : "text-gray-500 hover:text-gray-300 hover:bg-line"
                  }`}>
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>
          {days.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Noch keine Buchungen{filter.only === "rank" ? " mit Rang-Punkten" : ""}.</p>
          ) : (
            <>
              <ul>{visibleDays.map((d) => <DayBlock key={d.key} day={d} />)}</ul>
              {olderDays.length > 0 && (
                <details className="group mt-2">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200 [&::-webkit-details-marker]:hidden">
                    Ältere Tage ({olderDays.length}) <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul>{olderDays.map((d) => <DayBlock key={d.key} day={d} />)}</ul>
                </details>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

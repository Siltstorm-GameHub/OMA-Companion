import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { generateMonthlyQuests, QUEST_TYPE_META, type QuestType } from "@/lib/quests";
import { QUEST_ACTIONS, QUEST_PACED } from "@/lib/quests-meta";
import { CheckCircle2, ChevronDown, ChevronRight, Scroll } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";
import { EmptyState } from "@/components/EmptyState";
import QuestRegenerateButton from "./QuestRegenerateButton";
import { formatBerlinDate, getBerlinDateParts } from "@/lib/time";
import { spinDateKey } from "@/lib/daily-spin";
import { getSwipeSummary } from "@/lib/games/deck";
import { dailyRate, questCoins, questRatio, sortOpenQuests } from "@/lib/quest-view";

const MONTH_NAMES = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

type QuestWithProgress = { id: string; title: string; description: string; type: string; target: number; reward: number; progress: { current: number; completed: boolean }[] };

const toRow = (q: QuestWithProgress) => ({
  ...q,
  current: Math.min(q.progress[0]?.current ?? 0, q.target),
  completed: q.progress[0]?.completed ?? false,
});

export default async function QuestsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  const userId = me.id;
  const isStaff = me.role === "admin" || me.role === "moderator";

  const now = new Date();
  const nowParts = getBerlinDateParts(now);
  const month = nowParts.month;
  const year  = nowParts.year;

  // Letzter Tag des Monats (UTC-Kalenderarithmetik ist zeitzonenunabhängig für reine Tageszahlen).
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysLeft    = daysInMonth - nowParts.day;       // ohne heute → "neue Quests in X Tagen"
  const daysToGo    = daysLeft + 1;                     // inkl. heute → Tagesrate

  const visibleEvent = { hidden: false, OR: [{ seriesId: null }, { series: { hidden: false } }] };

  const [, currentQuests, historyQuests, spunToday, swipe, nextEvent, nextTournament, activePoll] = await Promise.all([
    generateMonthlyQuests(month, year),
    prisma.quest.findMany({
      where: { month, year },
      include: { progress: { where: { userId } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.quest.findMany({
      where: {
        OR: [
          { year, month: { lt: month } },
          { year: year - 1 },
        ],
        progress: { some: { userId } },
      },
      include: { progress: { where: { userId } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 40,
    }),
    // ── Hinweise "wo geht das gerade" ──
    prisma.dailySpin.findUnique({ where: { userId_date: { userId, date: spinDateKey() } }, select: { id: true } }).then(Boolean).catch(() => false),
    getSwipeSummary(userId).catch(() => null),
    prisma.event.findFirst({
      where: { ...visibleEvent, status: "open", startAt: { gt: now }, registrations: { none: { userId } } },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, startAt: true },
    }),
    prisma.event.findFirst({
      where: { ...visibleEvent, type: "tournament", status: { in: ["open", "closed"] }, startAt: { gt: now } },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, startAt: true },
    }),
    prisma.eventPoll.findFirst({
      where: { startAt: { lte: now }, endAt: { gt: now }, event: { hidden: false }, votes: { none: { voterId: userId } } },
      orderBy: { endAt: "asc" },
      select: { eventId: true, label: true, event: { select: { title: true } } },
    }),
  ]);

  const rows = currentQuests.map(toRow);
  const open = sortOpenQuests(rows);
  const done = rows.filter(q => q.completed);
  const coins = questCoins(rows);
  const allDone = rows.length > 0 && done.length === rows.length;
  const nextMonthName = MONTH_NAMES[month % 12];

  const guildId = process.env.DISCORD_GUILD_ID;
  const discordUrl = guildId ? `https://discord.com/channels/${guildId}` : null;
  const when = (d: Date) => formatBerlinDate(d, { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

  /** Ziel des Los-Buttons + Hinweis aus echten Daten */
  const actionFor = (type: QuestType): { label: string; href: string; external: boolean; hint: string | null } | null => {
    const a = QUEST_ACTIONS[type];
    if (!a) return null;
    switch (type) {
      case "DAILY_SPIN":
        return { label: a.label, href: a.href, external: false, hint: spunToday ? "heute schon gedreht" : "heute noch nicht gedreht" };
      case "GAME_SWIPE":
        return { label: a.label, href: a.href, external: false, hint: swipe && swipe.open > 0 ? `${swipe.open} ${swipe.open === 1 ? "Karte wartet" : "Karten warten"}` : null };
      case "EVENT_ATTEND":
        return nextEvent
          ? { label: a.label, href: `/tournament/${nextEvent.id}`, external: false, hint: `nächstes: ${nextEvent.title}, ${when(nextEvent.startAt)}` }
          : { label: a.label, href: a.href, external: false, hint: null };
      case "PREDICTION_MADE":
        return nextTournament
          ? { label: a.label, href: `/tournament/${nextTournament.id}`, external: false, hint: `z.B. ${nextTournament.title}` }
          : { label: a.label, href: a.href, external: false, hint: "gerade kein Turnier zum Tippen" };
      case "POLL_VOTE":
        return activePoll
          ? { label: a.label, href: `/tournament/${activePoll.eventId}#abstimmung`, external: false, hint: `läuft: ${activePoll.label} · ${activePoll.event.title}` }
          : { label: a.label, href: a.href, external: false, hint: "gerade läuft keine Abstimmung" };
      default:
        if (a.href === "discord") return discordUrl ? { label: a.label, href: discordUrl, external: true, hint: null } : null;
        return { label: a.label, href: a.href, external: false, hint: null };
    }
  };

  // Verlauf: ein Monat pro Zeile
  const historyByMonth = new Map<string, ReturnType<typeof toRow>[]>();
  for (const q of historyQuests) {
    const key = `${q.year}-${q.month}`;
    if (!historyByMonth.has(key)) historyByMonth.set(key, []);
    historyByMonth.get(key)!.push(toRow(q));
  }

  const BTN = "shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors";

  return (
    <div className="px-4 pb-6 pt-0 sm:p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">

      {/* ── Kopf: Fortschritt + Münzen ── */}
      <section aria-label="Quest-Fortschritt" className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <Scroll className="w-5 h-5 text-amber-400" />
              <h1 className="font-display text-2xl font-black text-white tracking-tight">Quests im {MONTH_NAMES[month - 1]}</h1>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              <span className={allDone ? "text-emerald-400 font-semibold" : "text-white font-semibold"}>{done.length} von {rows.length}</span> erledigt
              <span className="text-gray-600"> · </span>
              neue Quests {daysLeft === 0 ? "morgen" : `in ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tagen"}`}
            </p>
            <div className="mt-2.5 h-2 max-w-sm rounded-full bg-line overflow-hidden">
              <div className={`h-full rounded-full ${allDone ? "bg-emerald-400" : "bg-teal-400"}`} style={{ width: `${rows.length ? (done.length / rows.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-xl font-black tabular-nums text-amber-400">
              <CoinIcon size={16} />{coins.earned.toLocaleString("de-DE")}
              <span className="text-sm font-semibold text-gray-500">/ {coins.total.toLocaleString("de-DE")}</span>
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">Münzen verdient</p>
          </div>
          {isStaff && <QuestRegenerateButton />}
        </div>
        {allDone && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 px-3 py-2 text-sm text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Alles erledigt. Neue Quests gibt es am 1. {nextMonthName}.
          </p>
        )}
      </section>

      {rows.length === 0 && (
        <EmptyState
          type="quests"
          title="Keine Quests verfügbar"
          description="Quests werden am Anfang jeden Monats erstellt. Schau später noch mal vorbei."
        />
      )}

      {/* ── Offen: am nächsten am Ziel zuerst, mit Los-Button ── */}
      {open.length > 0 && (
        <section aria-label="Offene Quests" className="glass rounded-2xl overflow-hidden divide-y divide-line">
          {open.map(q => {
            const type = q.type as QuestType;
            const meta = QUEST_TYPE_META[type];
            const action = actionFor(type);
            const paced = QUEST_PACED[type];
            const rate = paced ? dailyRate(q, daysToGo) : null;
            const pct = Math.round(questRatio(q) * 100);
            return (
              <div key={q.id} className="flex items-start gap-3 px-4 py-3.5">
                <span className="text-xl leading-none mt-0.5 shrink-0" aria-hidden>{meta?.icon ?? "📜"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{q.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="tabular-nums">{q.current}/{q.target} {meta?.unit}</span>
                    {rate !== null && <> · <span className="text-gray-200">~{rate} {paced!.unit} pro Tag</span> bis Monatsende</>}
                    {action?.hint && <> · <span className="text-teal-300">{action.hint}</span></>}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
                    <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
                  </div>
                  {QUEST_ACTIONS[type] && <p className="text-[11px] text-gray-600 mt-1.5">{QUEST_ACTIONS[type]!.counts}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="flex items-center gap-0.5 text-xs font-bold text-amber-400 tabular-nums">+{q.reward}<CoinIcon size={12} /></span>
                  {action && (action.external
                    ? <a href={action.href} target="_blank" rel="noopener noreferrer" className={`${BTN} border border-line-strong bg-line text-gray-200 hover:bg-line`}>{action.label} ↗</a>
                    : <Link href={action.href} className={`${BTN} bg-teal-500 text-teal-950 hover:bg-teal-400`}>{action.label} <ChevronRight className="w-3.5 h-3.5" /></Link>)}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Erledigt: eingeklappt ── */}
      {done.length > 0 && !allDone && (
        <details className="group glass rounded-2xl overflow-hidden">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">{done.length} erledigt</span>
            <span className="text-xs text-gray-500">· +{coins.earned.toLocaleString("de-DE")} Münzen gutgeschrieben</span>
            <ChevronDown className="w-4 h-4 text-gray-500 ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {done.map(q => (
              <li key={q.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-base shrink-0" aria-hidden>{QUEST_TYPE_META[q.type as QuestType]?.icon ?? "📜"}</span>
                <span className="flex-1 min-w-0 truncate text-sm text-gray-300">{q.title}</span>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 tabular-nums">+{q.reward}<CoinIcon size={11} /></span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {allDone && (
        <section aria-label="Erledigte Quests" className="glass rounded-2xl overflow-hidden divide-y divide-line">
          {done.map(q => (
            <div key={q.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-base shrink-0" aria-hidden>{QUEST_TYPE_META[q.type as QuestType]?.icon ?? "📜"}</span>
              <span className="flex-1 min-w-0 truncate text-sm text-gray-300">{q.title}</span>
              <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 tabular-nums">+{q.reward}<CoinIcon size={11} /></span>
            </div>
          ))}
        </section>
      )}

      {/* ── Verlauf: ein Monat pro Zeile ── */}
      {historyByMonth.size > 0 && (
        <section aria-label="Vergangene Monate" className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Vergangene Monate</h2>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-line">
            {Array.from(historyByMonth.entries()).map(([key, quests]) => {
              const [y, m] = key.split("-").map(Number);
              const monthDone = quests.filter(q => q.completed).length;
              const monthCoins = questCoins(quests).earned;
              return (
                <details key={key} className="group">
                  <summary className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:bg-surface-2">
                    <span className="text-sm font-medium text-white w-28">{MONTH_NAMES[m - 1]} {y}</span>
                    <span className="text-xs text-gray-500 tabular-nums">{monthDone}/{quests.length} erledigt</span>
                    {monthCoins > 0 && <span className="text-xs font-semibold text-amber-400 tabular-nums">+{monthCoins.toLocaleString("de-DE")}</span>}
                    <ChevronDown className="w-4 h-4 text-gray-600 ml-auto transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="pb-2">
                    {quests.map(q => (
                      <li key={q.id} className={`flex items-center gap-3 px-4 py-1.5 text-xs ${q.completed ? "text-gray-300" : "text-gray-600"}`}>
                        <span aria-hidden>{QUEST_TYPE_META[q.type as QuestType]?.icon ?? "📜"}</span>
                        <span className="flex-1 min-w-0 truncate">{q.title}</span>
                        <span className="tabular-nums">{q.completed ? `+${q.reward}` : `${q.current}/${q.target}`}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

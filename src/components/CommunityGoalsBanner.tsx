import Link from "next/link";
import { Glyph } from "@/components/ui/Glyph";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  computeCommunityGoalProgress,
  formatGoalNumber,
  goalPace,
  goalUnit,
  isAvgGoal,
  type GoalPace,
  type CommunityGoalProgress,
} from "@/lib/community-goal";
import { isPeriodEvent, periodInfo } from "@/lib/event-period";
import { mayHaveGoalWhere, resolveEventGoal } from "@/lib/event-goal";
import { GOAL_FORMATS, GOAL_MATCH_SELECT } from "@/lib/community-goal";
import { parseGoalState } from "@/lib/community-goal-milestones";
import { goalHideCookie, goalSpotlight, goalStreak, type GoalSpotlight, type SpotlightKind } from "@/lib/goal-spotlight";
import GoalSpotlightDismiss from "@/components/GoalSpotlightDismiss";
import { ChevronRight, Target } from "@/components/icons";


const PACE_COLOR: Record<GoalPace["status"], string> = { ahead: "text-emerald-300", on_track: "text-primary-fg", behind: "text-amber-300" };
const PACE_ICON: Record<GoalPace["status"], string> = { ahead: "🚀", on_track: "✅", behind: "⚠️" };
const SPOTLIGHT_ICON: Record<SpotlightKind, string> = { reached: "🎉", milestone: "🎯", final: "⏳", start: "✨", live: "🎯" };

/** Wie viele frühere Termine einer Reihe als Punkte angezeigt werden */
const HISTORY_LEN = 6;

type GoalItem = {
  eventId: string;
  title: string;
  progress: CommunityGoalProgress;
  remainingLabel: string | null;
  pace: GoalPace | null;
  myValue: number;
  isParticipant: boolean;
  /** Anlass für die große Karte — null = schmale Leiste */
  spotlight: GoalSpotlight | null;
  /** Frühere Termine derselben Reihe, älteste zuerst: Ziel geschafft? */
  history: boolean[];
};

/**
 * Dashboard-Banner für laufende Community-Ziele (Punktewertung mit Ziel, siehe lib/community-goal.ts).
 * Normalerweise eine schmale Leiste je Ziel; nur zu Anlässen (Start, Meilenstein, Endspurt, geschafft —
 * lib/goal-spotlight.ts) als große Karte mit Fortschritt, Tempo und eigenem Beitrag. Die große Karte
 * lässt sich bis zum nächsten Anlass wegklicken. Bei Reihen zeigen Punkte, ob die letzten Termine
 * ihr Ziel geschafft haben — so wird aus einem Dauer-Ziel eine Serie.
 */
export default async function CommunityGoalsBanner({ userId }: { userId?: string | null }) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      hidden: false,
      format: { in: [...GOAL_FORMATS] },
      status: { in: ["open", "active"] },
      startAt: { lte: now },
      // Eigenes oder von der Reihe geerbtes Ziel (Feinprüfung per resolveEventGoal)
      AND: [mayHaveGoalWhere, { OR: [{ seriesId: null }, { series: { hidden: false } }] }],
    },
    orderBy: { startAt: "desc" },
    take: 8, // etwas mehr laden: Termine mit "kein Ziel" fallen erst bei der Feinprüfung raus
    select: {
      id: true, title: true, startAt: true, endAt: true, statConfigJson: true, format: true, goalStateJson: true, seriesId: true,
      series: { select: { tournamentTemplateJson: true } },
      registrations: userId ? { where: { userId }, select: { userId: true } } : { take: 0, select: { userId: true } },
      matches: { select: GOAL_MATCH_SELECT },
    },
  });

  const candidates = events.flatMap(ev => {
    const goal = resolveEventGoal(ev).goal;
    return goal ? [{ ev, goal }] : [];
  }).slice(0, 3);
  if (candidates.length === 0) return null;

  // Verlauf der Reihen: frühere Termine mit Ziel — "geschafft" steht in goalStateJson (Stufe 100)
  const seriesIds = [...new Set(candidates.map(c => c.ev.seriesId).filter((s): s is string => !!s))];
  const past = seriesIds.length === 0 ? [] : await prisma.event.findMany({
    where: {
      seriesId: { in: seriesIds },
      hidden: false,
      format: { in: [...GOAL_FORMATS] },
      id: { notIn: candidates.map(c => c.ev.id) },
      startAt: { lt: now },
      OR: [{ status: { in: ["finished", "closed"] } }, { endAt: { lt: now } }],
    },
    orderBy: { startAt: "desc" },
    take: seriesIds.length * HISTORY_LEN * 2,
    select: {
      seriesId: true, startAt: true, format: true, statConfigJson: true, goalStateJson: true,
      series: { select: { tournamentTemplateJson: true } },
    },
  });
  const historyBySeries = new Map<string, boolean[]>();
  for (const p of past) {
    if (!p.seriesId || !resolveEventGoal(p).goal) continue;
    const list = historyBySeries.get(p.seriesId) ?? [];
    if (list.length < HISTORY_LEN) list.push(parseGoalState(p.goalStateJson).milestones.includes(100));
    historyBySeries.set(p.seriesId, list);
  }

  const cookieStore = await cookies();

  const items: GoalItem[] = candidates.map(({ ev, goal }) => {
    const progress = computeCommunityGoalProgress(ev.matches, goal);
    const period = ev.endAt && isPeriodEvent(ev) ? periodInfo({ startAt: ev.startAt, endAt: ev.endAt }, now) : null;
    const pace = period && !period.ended && !isAvgGoal(goal) ? goalPace(progress.main.percent, period.progress) : null;
    const spotlight = goalSpotlight({
      startAt: ev.startAt,
      endAt: ev.endAt,
      percent: progress.main.percent,
      reached: progress.reached,
      pace,
      milestoneAt: parseGoalState(ev.goalStateJson).milestoneAt,
      now,
    });
    const hidden = spotlight && cookieStore.get(goalHideCookie(ev.id))?.value === spotlight.key;
    return {
      eventId: ev.id,
      title: goal.title || ev.title,
      progress,
      remainingLabel: period && !period.ended ? period.remainingLabel : null,
      pace,
      myValue: userId ? progress.byUser[userId] ?? 0 : 0,
      isParticipant: ev.registrations.length > 0,
      spotlight: hidden ? null : spotlight,
      history: [...(ev.seriesId ? historyBySeries.get(ev.seriesId) ?? [] : [])].reverse(),
    };
  });

  const big = items.filter(i => i.spotlight);
  const small = items.filter(i => !i.spotlight);

  return (
    <div className="space-y-2">
      {big.map(item => <SpotlightCard key={item.eventId} item={item} />)}
      {small.length > 0 && (
        <div className="surface rounded-card overflow-hidden divide-y divide-line border border-primary/10">
          {small.map(item => <CompactRow key={item.eventId} item={item} />)}
        </div>
      )}
    </div>
  );
}

/** "Ø 2,4" bzw. "1.250" */
function valueLabel(n: number, goal: CommunityGoalProgress["goal"]): string {
  return `${isAvgGoal(goal) ? "Ø " : ""}${formatGoalNumber(n, goal)}`;
}

/** Große Karte zu einem Anlass */
function SpotlightCard({ item }: { item: GoalItem }) {
  const { goal, main, reached } = item.progress;
  const unit = goalUnit(goal);
  const spotlight = item.spotlight!;
  const scopeLabel = goal.scope === "community"
    ? (reached ? "Geschafft — gemeinsam erreicht!" : "Gemeinsames Ziel")
    : goal.scope === "team" ? "Team-Ziel" : "Einzel-Ziel";
  const headline = reached ? scopeLabel : `${spotlight.label} · ${scopeLabel}`;
  return (
    <div className="relative">
      <Link href={`/tournament/${item.eventId}`}
        className="group block rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.08] via-emerald-500/[0.04] to-transparent px-4 py-3 transition-colors hover:border-primary/40">
        <div className="flex items-center gap-3 pr-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${reached ? "bg-amber-500/15 text-amber-300" : "bg-primary/15 text-primary-fg"}`}>
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold uppercase tracking-widest truncate ${reached ? "text-amber-300" : spotlight.kind === "final" ? "text-amber-300" : "text-primary-fg"}`}>
              {SPOTLIGHT_ICON[spotlight.kind]} {headline}{item.remainingLabel ? ` · ${item.remainingLabel}` : ""}
            </p>
            <p className="text-sm font-semibold text-white truncate group-hover:text-teal-100">{item.title}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-white tabular-nums">{Math.floor(main.percent)} %</p>
            <p className="text-xs text-gray-500 tabular-nums">{valueLabel(main.total, goal)} / {formatGoalNumber(goal.target, goal)}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 shrink-0" />
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-line overflow-hidden"
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(main.percent)}>
          <div className={`h-full rounded-full ${reached ? "bg-gradient-to-r from-amber-400 to-amber-300" : "bg-gradient-to-r from-primary to-emerald-400"}`}
            style={{ width: `${main.percent}%` }} />
        </div>
        {item.pace && (
          <p className={`mt-1.5 text-xs font-semibold ${PACE_COLOR[item.pace.status]}`}>
            {PACE_ICON[item.pace.status]} {item.pace.label} <span className="font-normal text-gray-500">· Soll nach Zeit: {Math.round(item.pace.expectedPercent)} %</span>
          </p>
        )}
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400 min-w-0">
            {item.myValue > 0
              ? <>{isAvgGoal(goal) ? "Dein Ø" : "Dein Beitrag"}: <span className="text-primary-fg font-semibold tabular-nums">{formatGoalNumber(item.myValue, goal)} {unit}</span></>
              : item.isParticipant
                ? <>Du bist dabei — {isAvgGoal(goal) ? "dein Ø zählt mit" : `jeder ${unit}-Wert zählt mit`}.</>
                : <>Mach mit: Jeder Beitrag zählt — {unit}.</>}
          </p>
          <HistoryDots history={item.history} current={reached} withStreak />
        </div>
      </Link>
      <GoalSpotlightDismiss eventId={item.eventId} spotlightKey={item.spotlight!.key} />
    </div>
  );
}

/** Schmale Leiste für die Zeit zwischen den Anlässen */
function CompactRow({ item }: { item: GoalItem }) {
  const { goal, main, reached } = item.progress;
  const status = reached
    ? <span className="text-amber-300">✓ geschafft</span>
    : item.pace?.status === "behind"
      ? <span className="text-amber-300/90">{item.remainingLabel ?? "läuft"}</span>
      : <span>{item.remainingLabel ?? "läuft"}</span>;
  return (
    <Link href={`/tournament/${item.eventId}`}
      className="group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-2">
      <ProgressRing percent={main.percent} reached={reached} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-200 truncate group-hover:text-white">
          <Glyph name="target" className="inline size-3.5 align-[-2px] text-primary" /> {item.title}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {status}
          {item.myValue > 0 && <> · {isAvgGoal(goal) ? "dein Ø" : "dein Beitrag"} <span className="text-primary-fg/90 tabular-nums">{formatGoalNumber(item.myValue, goal)}</span></>}
        </p>
      </div>
      <HistoryDots history={item.history} current={reached} />
      <span className="text-xs font-bold text-white tabular-nums shrink-0">{Math.floor(main.percent)} %</span>
      <span className="sr-only">{valueLabel(main.total, goal)} von {formatGoalNumber(goal.target, goal)}</span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300 shrink-0" />
    </Link>
  );
}

function ProgressRing({ percent, reached }: { percent: number; reached: boolean }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="3" className="stroke-white/[0.08]" />
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
        className={reached ? "stroke-amber-300" : "stroke-primary"}
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, percent) / 100)} />
    </svg>
  );
}

/** Punkte für frühere Termine der Reihe (● geschafft, ○ nicht) + aktueller Termin als Ring */
function HistoryDots({ history, current, withStreak }: { history: boolean[]; current: boolean; withStreak?: boolean }) {
  if (history.length === 0) return null;
  const streak = goalStreak(current ? [...history, true] : history);
  const done = history.filter(Boolean).length;
  return (
    <span className="flex items-center gap-1.5 shrink-0" title={`${done} von ${history.length} früheren Zielen geschafft`}>
      <span className="flex items-center gap-[3px]" aria-label={`${done} von ${history.length} früheren Zielen geschafft`}>
        {history.map((ok, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-primary" : "border border-gray-600"}`} />
        ))}
        <span className={`w-2 h-2 rounded-full border ${current ? "bg-amber-300 border-amber-300" : "border-primary/70"}`} />
      </span>
      {withStreak && streak >= 2 && (
        <span className="text-xs font-semibold text-amber-300 tabular-nums"><Glyph name="fire" className="inline size-3.5 align-[-2px]" /> {streak}× in Folge</span>
      )}
    </span>
  );
}

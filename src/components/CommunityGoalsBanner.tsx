import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  computeCommunityGoalProgress,
  goalPace,
  goalUnit,
  type GoalPace,
  parseCommunityGoal,
  type CommunityGoalProgress,
} from "@/lib/community-goal";
import { isPeriodEvent, periodInfo } from "@/lib/event-period";
import { ChevronRight, Target } from "@/components/icons";

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 0 });

const PACE_COLOR: Record<GoalPace["status"], string> = { ahead: "text-emerald-300", on_track: "text-teal-300", behind: "text-amber-300" };
const PACE_ICON: Record<GoalPace["status"], string> = { ahead: "🚀", on_track: "✅", behind: "⚠️" };

type GoalItem = {
  eventId: string;
  title: string;
  progress: CommunityGoalProgress;
  remainingLabel: string | null;
  pace: GoalPace | null;
  myValue: number;
  isParticipant: boolean;
};

/**
 * Dashboard-Banner für laufende Community-Ziele (Punktewertung mit Ziel, siehe lib/community-goal.ts):
 * "Gemeinsam schaffen wir …" mit Fortschritt, eigenem Beitrag und Restlaufzeit. Zeigt nur Events,
 * die gerade laufen bzw. offen sind und deren Ziel noch nicht erreicht ist — erreichte Ziele
 * werden kurz als Erfolg gefeiert, solange das Event noch läuft.
 */
export default async function CommunityGoalsBanner({ userId }: { userId?: string | null }) {
  const events = await prisma.event.findMany({
    where: {
      hidden: false,
      format: "coop_stats",
      status: { in: ["open", "active"] },
      startAt: { lte: new Date() },
      statConfigJson: { contains: "\"goal\"" },
      OR: [{ seriesId: null }, { series: { hidden: false } }],
    },
    orderBy: { startAt: "desc" },
    take: 3,
    select: {
      id: true, title: true, startAt: true, endAt: true, statConfigJson: true,
      registrations: userId ? { where: { userId }, select: { userId: true } } : { take: 0, select: { userId: true } },
      matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
    },
  });

  const items: GoalItem[] = events.flatMap(ev => {
    const goal = parseCommunityGoal(ev.statConfigJson);
    if (!goal) return [];
    const progress = computeCommunityGoalProgress(ev.matches, goal);
    const period = ev.endAt && isPeriodEvent(ev) ? periodInfo({ startAt: ev.startAt, endAt: ev.endAt }) : null;
    return [{
      eventId: ev.id,
      title: goal.title || ev.title,
      progress,
      remainingLabel: period && !period.ended ? period.remainingLabel : null,
      pace: period && !period.ended ? goalPace(progress.main.percent, period.progress) : null,
      myValue: userId ? progress.byUser[userId] ?? 0 : 0,
      isParticipant: ev.registrations.length > 0,
    }];
  });
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map(item => {
        const { goal, main, reached } = item.progress;
        const unit = goalUnit(goal);
        const headline = goal.scope === "community"
          ? (reached ? "Geschafft — gemeinsam erreicht!" : "Gemeinsames Ziel")
          : goal.scope === "team" ? "Team-Ziel" : "Einzel-Ziel";
        return (
          <Link key={item.eventId} href={`/tournament/${item.eventId}`}
            className="group block rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-500/[0.08] via-emerald-500/[0.04] to-transparent px-4 py-3 transition-colors hover:border-teal-400/40">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${reached ? "bg-amber-500/15 text-amber-300" : "bg-teal-500/15 text-teal-300"}`}>
                <Target className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${reached ? "text-amber-300" : "text-teal-300"}`}>
                  🎯 {headline}{item.remainingLabel ? ` · ${item.remainingLabel}` : ""}
                </p>
                <p className="text-sm font-semibold text-white truncate group-hover:text-teal-100">{item.title}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white tabular-nums">{Math.floor(main.percent)} %</p>
                <p className="text-[10px] text-gray-500 tabular-nums">{fmt(main.total)} / {fmt(goal.target)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 shrink-0" />
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-white/[0.06] overflow-hidden"
              role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(main.percent)}>
              <div className={`h-full rounded-full ${reached ? "bg-gradient-to-r from-amber-400 to-amber-300" : "bg-gradient-to-r from-teal-500 to-emerald-400"}`}
                style={{ width: `${main.percent}%` }} />
            </div>
            {item.pace && (
              <p className={`mt-1.5 text-[11px] font-semibold ${PACE_COLOR[item.pace.status]}`}>
                {PACE_ICON[item.pace.status]} {item.pace.label} <span className="font-normal text-gray-500">· Soll nach Zeit: {Math.round(item.pace.expectedPercent)} %</span>
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-gray-400">
              {item.myValue > 0
                ? <>Dein Beitrag: <span className="text-teal-300 font-semibold tabular-nums">{fmt(item.myValue)} {unit}</span></>
                : item.isParticipant
                  ? <>Du bist dabei — jeder {unit}-Wert zählt mit.</>
                  : <>Mach mit: Jeder Beitrag zählt — {unit}.</>}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

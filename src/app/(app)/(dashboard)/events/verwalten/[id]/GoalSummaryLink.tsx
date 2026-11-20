"use client";
import { goalSummary } from "./EventGoalPanel";
import type { EventEdit } from "./useEventEdit";

/** Kurzfassung des Community-Ziels mit Link zum Reiter "Ziel" — dort wird es eingestellt. Steht im
 *  Spielplan, damit dort sichtbar bleibt, welches Ziel gerade läuft. */
export default function GoalSummaryLink({ ctx }: { ctx: EventEdit }) {
  const { resolvedGoal, goalCapable, setActiveTab } = ctx;
  if (!goalCapable) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-2.5">
      <p className="flex-1 min-w-[200px] text-xs text-teal-100/90">
        🎯 {resolvedGoal.goal
          ? <>{goalSummary(resolvedGoal.goal)}{resolvedGoal.source === "series" && <span className="text-gray-500"> · Ziel der Reihe</span>}</>
          : "Kein Community-Ziel"}
      </p>
      <button type="button" onClick={() => setActiveTab("goal")} className="text-xs font-semibold text-teal-300 hover:text-teal-200">
        {resolvedGoal.goal ? "Ziel bearbeiten →" : "Ziel einrichten →"}
      </button>
    </div>
  );
}

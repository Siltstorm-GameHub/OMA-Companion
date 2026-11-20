"use client";
import TournamentManager from "../TournamentManager";
import GoalSummaryLink from "./GoalSummaryLink";
import type { EventEdit } from "./useEventEdit";

/** Reiter "Spielplan" bei Terminen einer Reihe mit festem Spiel: nur Turnierbaum und Ziel. */
export default function TabBracket({ ctx }: { ctx: EventEdit }) {
  const { event, resolvedGoal, tmPointsCfg, tmAvgDirection, bracketWinnerStatKeys, bracketMatchWinStatKeys, bracketPlacementPoints, bracketTournament, bracketRegisteredUsers } = ctx;
  return (
    <div className="space-y-4">
          {/* Community-Ziel: Kurzfassung, eingestellt wird es im Reiter "Ziel" */}
          <GoalSummaryLink ctx={ctx} />
          <TournamentManager
            event={{ id: event.id, startAt: event.startAt, endAt: event.endAt ?? null }}
            tournament={bracketTournament}
            allUsers={bracketRegisteredUsers}
            winnerStatKeys={bracketWinnerStatKeys}
            matchWinStatKeys={bracketMatchWinStatKeys}
            standaloneEvent={!event.series}
            placementPoints={bracketPlacementPoints}
                pointsCfg={tmPointsCfg}
                goal={resolvedGoal.goal}
                avgDirection={tmAvgDirection}
          />
        </div>
  );
}

"use client";
import TournamentManager from "../TournamentManager";
import GoalSummaryLink from "./GoalSummaryLink";
import CheckInPanel from "./CheckInPanel";
import type { EventEdit } from "./useEventEdit";

/** Reiter "Spielplan" bei Terminen einer Reihe mit festem Spiel: nur Turnierbaum und Ziel. */
export default function TabBracket({ ctx }: { ctx: EventEdit }) {
  const { event, resolvedGoal, tmPointsCfg, tmAvgDirection, bracketWinnerStatKeys, bracketMatchWinStatKeys, bracketPlacementPoints, bracketTournament, bracketRegisteredUsers } = ctx;
  const notReadyNames = event.checkInEnabled ? bracketRegisteredUsers.filter(u => !ctx.checkedInIds.has(u.id)).map(ctx.userName) : null;
  return (
    <div className="space-y-4">
          {/* Community-Ziel: Kurzfassung, eingestellt wird es im Reiter "Ziel" */}
          <GoalSummaryLink ctx={ctx} />
          {/* Check-in vor Turnierstart — nur Bereite werden ausgelost */}
          <CheckInPanel ctx={ctx} drawn={(bracketTournament?.matches.length ?? 0) > 0} />
          <TournamentManager
            event={{ id: event.id, startAt: event.startAt, endAt: event.endAt ?? null }}
            tournament={bracketTournament}
            allUsers={bracketRegisteredUsers}
            winnerStatKeys={bracketWinnerStatKeys}
            matchWinStatKeys={bracketMatchWinStatKeys}
            standaloneEvent={!event.series}
            singleMatch={event.series?.scheduleMode === "runden"}
            placementPoints={bracketPlacementPoints}
                pointsCfg={tmPointsCfg}
                goal={resolvedGoal.goal}
                avgDirection={tmAvgDirection}
                notReadyNames={notReadyNames}
          />
        </div>
  );
}

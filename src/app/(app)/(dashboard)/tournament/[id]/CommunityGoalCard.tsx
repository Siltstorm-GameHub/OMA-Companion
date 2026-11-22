import { formatGoalNumber, goalPercent, goalTargetLabel, goalUnit, isAvgGoal, meetsGoal, type CommunityGoalProgress, type GoalPace } from "@/lib/community-goal";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type Participant = { userId: string; user: User };

const uname = (u: User | undefined | null) => u?.username ?? u?.name ?? "?";

function Bar({ percent, reached, color = "teal" }: { percent: number; reached: boolean; color?: "teal" | "sky" | "rose" }) {
  const fill = reached
    ? "bg-gradient-to-r from-amber-400 to-amber-300"
    : color === "sky" ? "bg-sky-400" : color === "rose" ? "bg-rose-400" : "bg-gradient-to-r from-teal-500 to-emerald-400";
  return (
    <div className="h-2.5 w-full rounded-full bg-line overflow-hidden"
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

/**
 * Fortschritt des Community-Ziels (Zusatz zu Skill-Index/Durchschnittswerte, siehe lib/community-goal.ts)
 * auf der Turnierseite — oberhalb der normalen Tabelle. Summen-Ziele zeigen Beiträge, Ø-Ziele den
 * aktuellen Durchschnitt (abgerechnet erst am Ende des Zeitraums).
 */
export default function CommunityGoalCard({
  progress,
  participants,
  userId,
  pace = null,
  rewardCoins,
  settled = null,
  streak = null,
}: {
  /** Geschaffte Zyklen in Folge inkl. diesem (nur Eventreihen mit Serien-Bonus, sobald erreicht) */
  streak?: number | null;
  /** Ergebnis der Abrechnung am Ende des Zeitraums (null = noch offen) */
  settled?: { reached: boolean } | null;
  progress: CommunityGoalProgress;
  /** Tempo im Vergleich zur verstrichenen Zeit (nur Zeitraum-Events), siehe goalPace */
  pace?: GoalPace | null;
  /** Münzen pro Mitwirkendem bei Erreichen (Anzeige) */
  rewardCoins?: number;
  participants: Participant[];
  userId?: string | null;
}) {
  const { goal, byUser, byTeam, main } = progress;
  const unit = goalUnit(goal);
  const avg = isAvgGoal(goal);
  const fmt = (n: number) => formatGoalNumber(n, goal);
  const atMost = goal.direction === "atMost";
  // Ø-Ziel: bei "höchstens" ist der kleinste Ø der beste
  const sortDesc = !(avg && atMost);
  const reached = settled ? settled.reached : progress.reached;
  const avgPrefix = avg ? "Ø " : "";
  const userById = new Map(participants.map(p => [p.userId, p.user]));
  const ranked = Object.entries(byUser).sort((a, b) => (sortDesc ? b[1] - a[1] : a[1] - b[1]));
  const myValue = userId ? byUser[userId] ?? 0 : 0;
  const hasMine = !!userId && userId in byUser;
  const scopeLabel = goal.scope === "team" ? "Team-Ziel" : goal.scope === "solo" ? "Einzel-Ziel" : "Community-Ziel";

  return (
    <div className={`glass rounded-2xl p-5 mb-5 border ${reached ? "border-amber-400/30" : "border-teal-500/20"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-teal-400">🎯 {scopeLabel}</p>
          <h3 className="text-base font-semibold text-white truncate">
            {goal.title || goalTargetLabel(goal)}
          </h3>
          {avg && goal.title && <p className="text-xs text-gray-400 mt-0.5">{goalTargetLabel(goal)}</p>}
          {avg && !settled && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              Zwischenstand — abgerechnet wird am Ende des Zeitraums
              {progress.missingParticipants > 0 && ` · noch ${progress.missingParticipants} Teilnehmer mit Werten nötig`}
            </p>
          )}
          {pace && (
            <p className={`text-xs font-semibold mt-0.5 ${pace.status === "ahead" ? "text-emerald-300" : pace.status === "on_track" ? "text-teal-300" : "text-amber-300"}`}>
              {pace.status === "ahead" ? "🚀" : pace.status === "on_track" ? "✅" : "⚠️"} {pace.label}
              <span className="font-normal text-gray-500"> · Soll nach Zeit: {Math.round(pace.expectedPercent)} %</span>
            </p>
          )}
          {!!goal.rewardSeriesPoints && !reached && !settled && (
            <p className="text-[11px] text-amber-300/80 mt-0.5">🏆 +{goal.rewardSeriesPoints} Tabellenpunkte für die Eventreihe bei Erreichen</p>
          )}
          {goal.streakBonus && (
            <p className="text-[11px] text-orange-300/80 mt-0.5">
              🔥 Serien-Bonus: alle {goal.streakBonus.length} geschafften Zyklen in Folge +{goal.streakBonus.coins} Münzen
              {reached && streak && streak >= 2 ? ` · jetzt ${streak}× in Folge!` : ""}
            </p>
          )}
          {!!rewardCoins && rewardCoins > 0 && !reached && !settled && (
            <p className="text-[11px] text-amber-300/80 mt-0.5">🪙 {rewardCoins} Münzen {goal.scope === "team" ? "für alle im Siegerteam" : goal.scope === "solo" ? "für jeden, der die Marke erreicht" : "für alle Mitwirkenden, wenn das Ziel erreicht wird"}</p>
          )}
        </div>
        {reached ? (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30">
            🏆 {avg && !settled ? "Liegt im Ziel" : "Ziel erreicht"}
          </span>
        ) : settled ? (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-gray-300 bg-line border border-line-strong">
            Ziel verfehlt
          </span>
        ) : null}
      </div>

      {goal.scope === "community" && (
        <>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <p className="text-2xl font-bold text-white tabular-nums">
              {avgPrefix}{fmt(main.total)} <span className="text-sm font-normal text-gray-500">/ {avg && atMost ? "max. " : ""}{fmt(goal.target)} {unit}</span>
            </p>
            <p className="text-sm text-gray-400 tabular-nums">{Math.floor(main.percent)} %</p>
          </div>
          <Bar percent={main.percent} reached={main.reached} />
          {!main.reached && !avg && (
            <p className="text-xs text-gray-500 mt-1.5">Noch {fmt(goal.target - main.total)} {unit} bis zum Ziel.</p>
          )}
          {!meetsGoal(main.total, goal) && avg && progress.contributorIds.length > 0 && (
            <p className="text-xs text-gray-500 mt-1.5">
              Der gemeinsame Ø muss noch um {fmt(Math.abs(goal.target - main.total))} {atMost ? "sinken" : "steigen"}.
            </p>
          )}
          {avg && progress.contributorIds.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-1">Aus {progress.contributorIds.length} Teilnehmern mit Werten.</p>
          )}
          {ranked.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">{avg ? "Ø je Teilnehmer" : "Top-Beiträge"}</p>
              <ul className="space-y-1">
                {ranked.slice(0, 5).map(([uid, v]) => (
                  <li key={uid} className={`flex justify-between text-sm ${uid === userId ? "text-teal-300" : "text-gray-300"}`}>
                    <span className="truncate">{uname(userById.get(uid))}</span>
                    <span className="tabular-nums text-gray-400">
                      {avg ? `Ø ${fmt(v)}` : `${fmt(v)} · ${Math.round((v / Math.max(main.total, 1)) * 100)} %`}
                    </span>
                  </li>
                ))}
              </ul>
              {hasMine && !ranked.slice(0, 5).some(([uid]) => uid === userId) && (avg || myValue > 0) && (
                <p className="text-xs text-teal-300 mt-1.5">{avg ? `Dein Ø: ${fmt(myValue)}` : `Dein Beitrag: ${fmt(myValue)}`} {unit}</p>
              )}
            </div>
          )}
        </>
      )}

      {goal.scope === "team" && (
        <div className="space-y-3">
          {(["A", "B"] as const).map(t => {
            const v = byTeam[t];
            const teamHasData = avg ? progress.contributorIds.length > 0 && v !== 0 : true;
            const pct = goalPercent(v, goal, teamHasData);
            const done = progress.reachedTeams.includes(t);
            return (
              <div key={t}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <p className={`text-sm font-semibold ${t === "A" ? "text-sky-300" : "text-rose-300"}`}>
                    Team {t} {done && "🏆"}
                  </p>
                  <p className="text-sm text-gray-300 tabular-nums">
                    {avgPrefix}{fmt(v)} <span className="text-gray-500">/ {avg && atMost ? "max. " : ""}{fmt(goal.target)} {unit}</span>
                  </p>
                </div>
                <Bar percent={pct} reached={done} color={t === "A" ? "sky" : "rose"} />
              </div>
            );
          })}
          {byTeam.A + byTeam.B === 0 && progress.total > 0 && (
            <p className="text-xs text-gray-500">Noch keinem Spieler ein Team zugeordnet — Werte zählen erst mit Team-Zuordnung.</p>
          )}
        </div>
      )}

      {goal.scope === "solo" && (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            Jeder für sich: {avg ? goalTargetLabel(goal) : `${fmt(goal.target)} ${unit}`} pro Spieler
            {progress.reachedUserIds.length > 0 && ` · ${progress.reachedUserIds.length} ${progress.reachedUserIds.length === 1 ? "hat" : "haben"} es geschafft`}
          </p>
          {ranked.length === 0 ? (
            <p className="text-sm text-gray-500">Noch keine Werte eingetragen.</p>
          ) : (
            <ul className="space-y-2.5">
              {ranked.slice(0, 10).map(([uid, v]) => {
                const done = progress.reachedUserIds.includes(uid);
                return (
                  <li key={uid}>
                    <div className="flex justify-between gap-2 text-sm mb-1">
                      <span className={`truncate ${uid === userId ? "text-teal-300 font-medium" : "text-gray-300"}`}>
                        {uname(userById.get(uid))} {done && "🏆"}
                      </span>
                      <span className="tabular-nums text-gray-400">{avgPrefix}{fmt(v)} / {fmt(goal.target)}</span>
                    </div>
                    <Bar percent={goalPercent(v, goal)} reached={done} />
                  </li>
                );
              })}
            </ul>
          )}
          {hasMine && !ranked.slice(0, 10).some(([uid]) => uid === userId) && (
            <p className="text-xs text-teal-300 mt-2">Dein Stand: {avgPrefix}{fmt(myValue)} / {fmt(goal.target)} {unit}</p>
          )}
        </div>
      )}
    </div>
  );
}

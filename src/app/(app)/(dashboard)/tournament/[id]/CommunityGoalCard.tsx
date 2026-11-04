import { goalPercent, goalUnit, type CommunityGoalProgress, type GoalPace } from "@/lib/community-goal";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type Participant = { userId: string; user: User };

const uname = (u: User | undefined | null) => u?.username ?? u?.name ?? "?";
const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

function Bar({ percent, reached, color = "teal" }: { percent: number; reached: boolean; color?: "teal" | "sky" | "rose" }) {
  const fill = reached
    ? "bg-gradient-to-r from-amber-400 to-amber-300"
    : color === "sky" ? "bg-sky-400" : color === "rose" ? "bg-rose-400" : "bg-gradient-to-r from-teal-500 to-emerald-400";
  return (
    <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden"
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

/**
 * Fortschritt des Community-Ziels (Skill-Index-Zusatz, siehe lib/community-goal.ts) auf der
 * Turnierseite — oberhalb der normalen Skill-Index-Tabelle.
 */
export default function CommunityGoalCard({
  progress,
  participants,
  userId,
  pace = null,
  rewardCoins,
}: {
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
  const userById = new Map(participants.map(p => [p.userId, p.user]));
  const ranked = Object.entries(byUser).sort((a, b) => b[1] - a[1]);
  const myValue = userId ? byUser[userId] ?? 0 : 0;
  const scopeLabel = goal.scope === "team" ? "Team-Ziel" : goal.scope === "solo" ? "Einzel-Ziel" : "Community-Ziel";

  return (
    <div className={`glass rounded-2xl p-5 mb-5 border ${progress.reached ? "border-amber-400/30" : "border-teal-500/20"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-teal-400">🎯 {scopeLabel}</p>
          <h3 className="text-base font-semibold text-white truncate">
            {goal.title || `${fmt(goal.target)} ${unit}`}
          </h3>
          {pace && (
            <p className={`text-xs font-semibold mt-0.5 ${pace.status === "ahead" ? "text-emerald-300" : pace.status === "on_track" ? "text-teal-300" : "text-amber-300"}`}>
              {pace.status === "ahead" ? "🚀" : pace.status === "on_track" ? "✅" : "⚠️"} {pace.label}
              <span className="font-normal text-gray-500"> · Soll nach Zeit: {Math.round(pace.expectedPercent)} %</span>
            </p>
          )}
          {!!rewardCoins && rewardCoins > 0 && !progress.reached && (
            <p className="text-[11px] text-amber-300/80 mt-0.5">🪙 {rewardCoins} Münzen {goal.scope === "team" ? "für alle im Siegerteam" : goal.scope === "solo" ? "für jeden, der die Marke erreicht" : "für alle Mitwirkenden, wenn das Ziel erreicht wird"}</p>
          )}
        </div>
        {progress.reached && (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30">
            🏆 Ziel erreicht
          </span>
        )}
      </div>

      {goal.scope === "community" && (
        <>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <p className="text-2xl font-bold text-white tabular-nums">
              {fmt(main.total)} <span className="text-sm font-normal text-gray-500">/ {fmt(goal.target)} {unit}</span>
            </p>
            <p className="text-sm text-gray-400 tabular-nums">{Math.floor(main.percent)} %</p>
          </div>
          <Bar percent={main.percent} reached={main.reached} />
          {!main.reached && (
            <p className="text-xs text-gray-500 mt-1.5">Noch {fmt(goal.target - main.total)} {unit} bis zum Ziel.</p>
          )}
          {ranked.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">Top-Beiträge</p>
              <ul className="space-y-1">
                {ranked.slice(0, 5).map(([uid, v]) => (
                  <li key={uid} className={`flex justify-between text-sm ${uid === userId ? "text-teal-300" : "text-gray-300"}`}>
                    <span className="truncate">{uname(userById.get(uid))}</span>
                    <span className="tabular-nums text-gray-400">{fmt(v)} · {Math.round((v / Math.max(main.total, 1)) * 100)} %</span>
                  </li>
                ))}
              </ul>
              {userId && myValue > 0 && !ranked.slice(0, 5).some(([uid]) => uid === userId) && (
                <p className="text-xs text-teal-300 mt-1.5">Dein Beitrag: {fmt(myValue)} {unit}</p>
              )}
            </div>
          )}
        </>
      )}

      {goal.scope === "team" && (
        <div className="space-y-3">
          {(["A", "B"] as const).map(t => {
            const v = byTeam[t];
            const pct = goalPercent(v, goal.target);
            const done = v >= goal.target;
            return (
              <div key={t}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <p className={`text-sm font-semibold ${t === "A" ? "text-sky-300" : "text-rose-300"}`}>
                    Team {t} {done && "🏆"}
                  </p>
                  <p className="text-sm text-gray-300 tabular-nums">
                    {fmt(v)} <span className="text-gray-500">/ {fmt(goal.target)} {unit}</span>
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
            Jeder für sich: {fmt(goal.target)} {unit} pro Spieler
            {progress.reachedUserIds.length > 0 && ` · ${progress.reachedUserIds.length} ${progress.reachedUserIds.length === 1 ? "hat" : "haben"} es geschafft`}
          </p>
          {ranked.length === 0 ? (
            <p className="text-sm text-gray-500">Noch keine Werte eingetragen.</p>
          ) : (
            <ul className="space-y-2.5">
              {ranked.slice(0, 10).map(([uid, v]) => {
                const done = v >= goal.target;
                return (
                  <li key={uid}>
                    <div className="flex justify-between gap-2 text-sm mb-1">
                      <span className={`truncate ${uid === userId ? "text-teal-300 font-medium" : "text-gray-300"}`}>
                        {uname(userById.get(uid))} {done && "🏆"}
                      </span>
                      <span className="tabular-nums text-gray-400">{fmt(v)} / {fmt(goal.target)}</span>
                    </div>
                    <Bar percent={goalPercent(v, goal.target)} reached={done} />
                  </li>
                );
              })}
            </ul>
          )}
          {userId && myValue > 0 && !ranked.slice(0, 10).some(([uid]) => uid === userId) && (
            <p className="text-xs text-teal-300 mt-2">Dein Stand: {fmt(myValue)} / {fmt(goal.target)} {unit}</p>
          )}
        </div>
      )}
    </div>
  );
}

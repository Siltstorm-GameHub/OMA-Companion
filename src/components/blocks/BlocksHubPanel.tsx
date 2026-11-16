// ============================================
// OMA Blocks — Bereich im Games-Hub (/games)
// ============================================
// Start-Block (eigener Monatsstand, Abstand nach oben, Monatsziel), Versus mit Live-Raumliste,
// Belohnungen zum Monatsende, Monats- und All-Time-Rangliste, Versus-Siege im Monat und die Sieger der
// letzten Monate.

import Link from "next/link";
import { seasonDaysLeft, seasonKey, seasonLabel } from "@/lib/month-season";
import { ALL_TIME, getBlocksPlace, getBlocksRanking, getFinishedBlocksSeasons, getVersusWins, type BlocksRankingRow } from "@/lib/blocks/scores";
import LeaderboardList, { type LeaderboardEntry } from "@/components/games/LeaderboardList";
import { Crown } from "@/components/icons";
import BlocksRankingTabs from "./BlocksRankingTabs";
import { getBlocksRewards, rewardLabel } from "@/lib/blocks/rewards-config";
import { getBlocksGoals } from "@/lib/blocks/goals-config";
import { getActiveChallenges } from "@/lib/blocks/challenge";
import { getActiveTournaments } from "@/lib/blocks/tournament";
import ChallengeCard from "./ChallengeCard";
import TournamentTeaser from "./TournamentTeaser";
import BlocksStartCard, { BlocksRewardsOverview } from "./BlocksStartCard";
import OmaWordmark from "@/components/OmaWordmark";
import OmaOriginalMark from "@/components/OmaOriginalMark";
import VersusLobbyLive from "./VersusLobbyLive";

const PREVIEW = 10;
const fmt = (n: number) => n.toLocaleString("de-DE");

function toEntry(r: BlocksRankingRow): LeaderboardEntry {
  return { userId: r.userId, name: r.name, image: r.image, value: fmt(r.score), detail: `${r.lines} Linien · Level ${r.level}` };
}

export default async function BlocksHubPanel({ userId }: { userId: string }) {
  const season = seasonKey();
  const label = seasonLabel(season);
  const [monthRows, allRows, monthPlace, allPlace, finished, versus, rewards, goals, challenges, tournaments] = await Promise.all([
    getBlocksRanking(season, 100),
    getBlocksRanking(ALL_TIME, 100),
    getBlocksPlace(userId, season),
    getBlocksPlace(userId, ALL_TIME),
    getFinishedBlocksSeasons(6),
    getVersusWins(season, 10),
    getBlocksRewards(),
    getBlocksGoals(),
    getActiveChallenges(userId),
    getActiveTournaments(),
  ]);
  const rewardRows = rewards.map((r, i) => ({ place: i + 1, label: rewardLabel(r) })).filter((r) => r.label);
  const daysLeft = seasonDaysLeft();
  // Wer direkt vor einem liegt (bzw. als Erster: direkt dahinter) — aus der geladenen Top 100.
  const neighbourScore = !monthPlace
    ? null
    : monthPlace.place === 1
      ? monthRows[1]?.score ?? null
      : monthRows[monthPlace.place - 2]?.score ?? null;

  const versusEntries: LeaderboardEntry[] = versus.map((v) => ({
    userId: v.userId, name: v.name, image: v.image,
    value: `${v.wins} ${v.wins === 1 ? "Sieg" : "Siege"}`,
    detail: `${v.played} ${v.played === 1 ? "Runde" : "Runden"} gespielt`,
  }));

  // Letzte Monatssieger als eine Zeile unter der Rangliste
  const pastWinners = finished.filter((s) => s.top.length > 0);

  return (
    <div className="space-y-5">
      {/* Kopf: OMA Blocks als eigenes Produkt der Old Masters Allies */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-1.5">
          <h1><OmaWordmark product="blocks" size="lg" /></h1>
          <p className="text-xs text-gray-500">Das Community-Spiel der Old Masters Allies · Monatswertung, Versus und Live-Turniere</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
            {label} · noch {daysLeft} {daysLeft === 1 ? "Tag" : "Tage"}
          </span>
          <OmaOriginalMark />
        </div>
      </div>

      {/* Laufende / anstehende Events */}
      {(tournaments.length > 0 || challenges.length > 0) && (
        <div className="grid gap-3">
          {tournaments.map((t) => <TournamentTeaser key={t.eventId} t={t} />)}
          {challenges.map((c) => <ChallengeCard key={c.eventId} p={c} compact />)}
        </div>
      )}

      {/* Spielen: Solo und Versus gleichrangig nebeneinander */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-stretch">
        <BlocksStartCard
          monthLabel={label}
          daysLeft={daysLeft}
          month={monthPlace}
          allTime={allPlace}
          neighbourScore={neighbourScore}
          goals={goals}
        />
        <VersusLobbyLive />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-start">
        {/* Belohnungen zum Monatsende: Top 3 und persönliche Monatsziele */}
        <BlocksRewardsOverview monthLabel={label} places={rewardRows} goals={goals} score={monthPlace?.score ?? 0} />

        {/* Ranglisten + letzte Monatssieger */}
        <div className="space-y-3 min-w-0">
          <BlocksRankingTabs
            monthLabel={label}
            month={
              <LeaderboardList
                rows={monthRows.map(toEntry)}
                viewerId={userId}
                limit={PREVIEW}
                note={`Höchster Score im ${label} · am Monatsende gibt es Belohnungen für die Top 3, danach beginnt die Wertung neu`}
                emptyText="In diesem Monat hat noch niemand gespielt — hol dir Platz 1!"
                absentText="Spiel eine Solo-Runde, um in der Monatswertung zu erscheinen."
              />
            }
            allTime={
              <LeaderboardList
                rows={allRows.map(toEntry)}
                viewerId={userId}
                limit={PREVIEW}
                note="Höchster Score aller Zeiten"
                emptyText="Noch keine Einträge."
                absentText="Spiel eine Solo-Runde, um in der All-Time-Wertung zu erscheinen."
              />
            }
            versus={
              <LeaderboardList
                rows={versusEntries}
                viewerId={userId}
                limit={PREVIEW}
                note={`Gewonnene Versus-Runden im ${label}`}
                emptyText="In diesem Monat wurde noch keine Versus-Runde gewonnen."
                absentText="Gewinne eine Versus-Runde, um hier zu erscheinen."
              />
            }
          />
          {pastWinners.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-0.5 text-[11px] text-gray-500">
              <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" /> Letzte Sieger:
              {pastWinners.map((s, i) => (
                <span key={s.season}>
                  {s.label.split(" ")[0].slice(0, 3)}{" "}
                  <Link href={`/profile/${s.top[0].userId}`} className="text-gray-300 hover:text-white">{s.top[0].name}</Link>
                  {i < pastWinners.length - 1 && " ·"}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

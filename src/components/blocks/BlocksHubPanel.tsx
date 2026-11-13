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
import { Crown, Trophy } from "@/components/icons";
import BlocksRankingTabs from "./BlocksRankingTabs";
import { getBlocksRewards, rewardLabel } from "@/lib/blocks/rewards-config";
import { getBlocksGoals } from "@/lib/blocks/goals-config";
import { getActiveChallenges } from "@/lib/blocks/challenge";
import { getActiveTournaments } from "@/lib/blocks/tournament";
import ChallengeCard from "./ChallengeCard";
import TournamentTeaser from "./TournamentTeaser";
import BlocksStartCard, { BlocksRewardsOverview } from "./BlocksStartCard";
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

  return (
    <div className="space-y-8">
      {/* Laufende / anstehende Events */}
      {(tournaments.length > 0 || challenges.length > 0) && (
        <div className="grid gap-3">
          {tournaments.map((t) => <TournamentTeaser key={t.eventId} t={t} />)}
          {challenges.map((c) => <ChallengeCard key={c.eventId} p={c} compact />)}
        </div>
      )}

      {/* Start: eigener Monatsstand, nächstes Ziel (für Neue: Einstieg mit Steuerung) */}
      <BlocksStartCard
        monthLabel={label}
        daysLeft={daysLeft}
        month={monthPlace}
        allTime={allPlace}
        neighbourScore={neighbourScore}
        goals={goals}
      />

      {/* Versus mit Live-Raumliste */}
      <VersusLobbyLive />

      {/* Belohnungen zum Monatsende: Top 3 und Monatsziele */}
      <BlocksRewardsOverview monthLabel={label} places={rewardRows} goals={goals} />

      {/* Ranglisten */}
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

      {/* Monatssieger */}
      {finished.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-300" /> Monatssieger
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {finished.map((s) => (
              <div key={s.season} className="glass rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{s.label}</p>
                {s.top.length === 0 && <p className="text-xs text-gray-500">Keine Teilnehmer</p>}
                {s.top.map((t, i) => (
                  <Link key={t.userId} href={`/profile/${t.userId}`} className="flex items-center gap-2 text-xs hover:text-white">
                    {i === 0 ? <Crown className="w-3.5 h-3.5 text-amber-300" /> : <span className="w-3.5 text-center text-gray-500">{i + 1}</span>}
                    <span className="flex-1 truncate text-white font-semibold">{t.name}</span>
                    <span className="tabular-nums text-gray-300">{fmt(t.score)}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

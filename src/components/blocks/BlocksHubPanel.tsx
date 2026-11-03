// ============================================
// OMA Blocks — Bereich im Games-Hub (/gems?spiel=blocks)
// ============================================
// Spielmodi (Solo/Versus), eigene Bestwerte, Monats- und All-Time-Rangliste, Versus-Siege im Monat
// und die Sieger der letzten Monate.

import Link from "next/link";
import { seasonDaysLeft, seasonKey, seasonLabel } from "@/lib/gems/tower-season";
import { ALL_TIME, getBlocksPlace, getBlocksRanking, getFinishedBlocksSeasons, getVersusWins, type BlocksRankingRow } from "@/lib/blocks/scores";
import LeaderboardList from "@/components/gems/LeaderboardList";
import type { LeaderboardEntry } from "@/lib/gems/leaderboard";
import { ChevronRight, Crown, Play, Swords, Trophy } from "@/components/icons";
import BlocksRankingTabs from "./BlocksRankingTabs";

const PREVIEW = 10;
const fmt = (n: number) => n.toLocaleString("de-DE");

function toEntry(r: BlocksRankingRow): LeaderboardEntry {
  return { userId: r.userId, name: r.name, image: r.image, value: fmt(r.score), detail: `${r.lines} Linien · Level ${r.level}` };
}

export default async function BlocksHubPanel({ userId }: { userId: string }) {
  const season = seasonKey();
  const label = seasonLabel(season);
  const [monthRows, allRows, monthPlace, allPlace, finished, versus] = await Promise.all([
    getBlocksRanking(season, 100),
    getBlocksRanking(ALL_TIME, 100),
    getBlocksPlace(userId, season),
    getBlocksPlace(userId, ALL_TIME),
    getFinishedBlocksSeasons(6),
    getVersusWins(season, 10),
  ]);
  const daysLeft = seasonDaysLeft();

  const versusEntries: LeaderboardEntry[] = versus.map((v) => ({
    userId: v.userId, name: v.name, image: v.image,
    value: `${v.wins} ${v.wins === 1 ? "Sieg" : "Siege"}`,
    detail: `${v.played} ${v.played === 1 ? "Runde" : "Runden"} gespielt`,
  }));

  return (
    <div className="space-y-8">
      {/* Spielmodi */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/gems/blocks" className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors group">
          <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.25)" }}>
            <Play className="w-5 h-5 text-teal-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-display text-lg font-bold text-white">Solo · Marathon</span>
            <span className="block text-xs text-gray-400">Highscore jagen — zählt für Monats- und All-Time-Rangliste.</span>
          </span>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white shrink-0" />
        </Link>
        <Link href="/gems/blocks/versus" className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors group">
          <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.25)" }}>
            <Swords className="w-5 h-5 text-violet-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-display text-lg font-bold text-white">Versus</span>
            <span className="block text-xs text-gray-400">Echtzeit gegen bis zu 7 Leute — Linien schicken Garbage rüber.</span>
          </span>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white shrink-0" />
        </Link>
      </div>

      {/* Eigene Bestwerte */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Dein Bestwert · {label}</p>
          <p className="font-display text-2xl font-black text-white tabular-nums">{fmt(monthPlace?.score ?? 0)}</p>
          <p className="text-xs text-gray-400">{monthPlace ? `Platz ${monthPlace.place}` : "Noch kein Eintrag"} · noch {daysLeft} {daysLeft === 1 ? "Tag" : "Tage"}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Dein All-Time-Rekord</p>
          <p className="font-display text-2xl font-black text-white tabular-nums">{fmt(allPlace?.score ?? 0)}</p>
          <p className="text-xs text-gray-400">{allPlace ? `Platz ${allPlace.place}` : "Noch kein Eintrag"}</p>
        </div>
      </div>

      {/* Ranglisten */}
      <BlocksRankingTabs
        monthLabel={label}
        month={
          <LeaderboardList
            rows={monthRows.map(toEntry)}
            viewerId={userId}
            limit={PREVIEW}
            note={`Höchster Score im ${label} · am Monatsende wird die Wertung eingefroren und beginnt neu`}
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

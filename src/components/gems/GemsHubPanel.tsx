// ============================================
// OMA Gems — Bereich im Games-Hub (/gems)
// ============================================
// Spielmodi (Klassisch / Tages-Herausforderung), eigene Bestwerte, Ranglisten (Monat, All-Time, Heute),
// Belohnungen zum Monatsende, Monatssieger und das tägliche Glücksrad.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { berlinDayKey, seasonDaysLeft, seasonKey, seasonLabel } from "@/lib/month-season";
import {
  CLASSIC_ALL_TIME,
  classicMonthBoard,
  dailyBoard,
  getFinishedGemsMonths,
  getGemsPlace,
  getGemsRanking,
  getGemsRewards,
  type GemsRankingRow,
} from "@/lib/gems/scores";
import { rewardLabel } from "@/lib/blocks/rewards-config";
import { getShopConfig } from "@/lib/shop-config";
import LeaderboardList, { type LeaderboardEntry } from "@/components/games/LeaderboardList";
import RankingTabs from "@/components/games/RankingTabs";
import DailySpin from "@/components/shop/DailySpin";
import GemIcon from "./GemIcon";
import { Calendar, ChevronRight, Crown, Trophy } from "@/components/icons";

const PREVIEW = 10;
const fmt = (n: number) => n.toLocaleString("de-DE");

function toEntry(r: GemsRankingRow, withLevel: boolean): LeaderboardEntry {
  return { userId: r.userId, name: r.name, image: r.image, value: `${fmt(r.score)} Punkte`, detail: withLevel ? `Level ${r.level}` : "Tages-Herausforderung" };
}

export default async function GemsHubPanel({ userId }: { userId: string }) {
  const season = seasonKey();
  const label = seasonLabel(season);
  const day = berlinDayKey();
  const monthBoard = classicMonthBoard(season);
  const todayBoard = dailyBoard(day);
  const [monthRows, allRows, todayRows, monthPlace, allPlace, todayPlace, finished, rewards, shopConfig, user, todaySpin] = await Promise.all([
    getGemsRanking(monthBoard, 100),
    getGemsRanking(CLASSIC_ALL_TIME, 100),
    getGemsRanking(todayBoard, 100),
    getGemsPlace(userId, monthBoard),
    getGemsPlace(userId, CLASSIC_ALL_TIME),
    getGemsPlace(userId, todayBoard),
    getFinishedGemsMonths(6),
    getGemsRewards(),
    getShopConfig(),
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
    prisma.dailySpin.findFirst({ where: { userId, date: new Date().toISOString().slice(0, 10) } }).catch(() => null),
  ]);
  const rewardRows = rewards.map((r, i) => ({ place: i + 1, label: rewardLabel(r) })).filter((r) => r.label);
  const daysLeft = seasonDaysLeft();

  return (
    <div className="space-y-8">
      {/* Spielmodi */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/gems/spielen" className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors group">
          <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 p-2" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <GemIcon piece={{ kind: "gem", color: 3, special: "none" }} uid="hub-classic" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-display text-lg font-bold text-white">Klassisch</span>
            <span className="block text-xs text-gray-400">Level für Level mit Zielen, Kombos, Sternen — und immer neuen Hindernissen.</span>
          </span>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white shrink-0" />
        </Link>
        <Link href="/gems/taeglich" className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors group">
          <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.25)" }}>
            <Calendar className="w-5 h-5 text-amber-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-display text-lg font-bold text-white">Tages-Herausforderung</span>
            <span className="block text-xs text-gray-400">
              Ein Brett und derselbe Nachschub für alle, 30 Züge. {todayPlace ? `Du bist heute auf Platz ${todayPlace.place}.` : "Heute noch nicht gespielt."}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white shrink-0" />
        </Link>
      </div>

      {/* Eigene Bestwerte */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Dein Bestwert · {label}</p>
          <p className="font-display text-2xl font-black text-white tabular-nums">{fmt(monthPlace?.score ?? 0)}</p>
          <p className="text-xs text-gray-400">
            {monthPlace ? `Platz ${monthPlace.place} · Level ${monthPlace.level}` : "Noch kein Eintrag"} · noch {daysLeft} {daysLeft === 1 ? "Tag" : "Tage"}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Dein All-Time-Rekord</p>
          <p className="font-display text-2xl font-black text-white tabular-nums">{fmt(allPlace?.score ?? 0)}</p>
          <p className="text-xs text-gray-400">{allPlace ? `Platz ${allPlace.place} · Level ${allPlace.level}` : "Noch kein Eintrag"}</p>
        </div>
      </div>

      {/* Monatsbelohnung */}
      {rewardRows.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Belohnung zum Monatsende · {label} · Klassisch</p>
          <div className="grid sm:grid-cols-3 gap-2">
            {rewardRows.map((r) => (
              <div key={r.place} className="flex items-center gap-2 text-xs">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] text-black shrink-0" style={{ background: ["#fbbf24", "#d1d5db", "#f0a868"][r.place - 1] }}>
                  {r.place}
                </span>
                <span className="text-white font-semibold">{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranglisten */}
      <RankingTabs
        tabs={[
          {
            key: "month",
            label,
            content: (
              <LeaderboardList
                rows={monthRows.map((r) => toEntry(r, true))}
                viewerId={userId}
                limit={PREVIEW}
                note={`Höchste Punktzahl im klassischen Modus im ${label} · am Monatsende gibt es Belohnungen für die Top 3`}
                emptyText="In diesem Monat hat noch niemand gespielt — hol dir Platz 1!"
                absentText="Spiel eine klassische Runde, um in der Monatswertung zu erscheinen."
              />
            ),
          },
          {
            key: "all",
            label: "All-Time",
            content: (
              <LeaderboardList
                rows={allRows.map((r) => toEntry(r, true))}
                viewerId={userId}
                limit={PREVIEW}
                note="Höchste Punktzahl im klassischen Modus aller Zeiten"
                emptyText="Noch keine Einträge."
                absentText="Spiel eine klassische Runde, um in der All-Time-Wertung zu erscheinen."
              />
            ),
          },
          {
            key: "today",
            label: "Heute",
            content: (
              <LeaderboardList
                rows={todayRows.map((r) => toEntry(r, false))}
                viewerId={userId}
                limit={PREVIEW}
                note="Beste Punktzahl in der heutigen Tages-Herausforderung · alle spielen dasselbe Brett"
                emptyText="Heute hat noch niemand die Tages-Herausforderung gespielt."
                absentText="Spiel die Tages-Herausforderung, um hier zu erscheinen."
              />
            ),
          },
        ]}
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

      {/* Glücksrad */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-white">Tägliches Glücksrad</h2>
        <DailySpin
          alreadySpun={!!todaySpin}
          lastResult={todaySpin ? { prizeLabel: todaySpin.prizeLabel, prizeType: todaySpin.prizeType } : null}
          initialPoints={user?.points ?? 0}
          prizes={shopConfig.wheelPrizes}
        />
      </div>
    </div>
  );
}

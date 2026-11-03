// ============================================
// OMA Blocks — Community-Challenge: Fortschrittskarte (Games-Hub kompakt, Event-Seite ausführlich)
// ============================================

import Link from "next/link";
import Image from "next/image";
import { formatBerlinDateTime } from "@/lib/time";
import { Play, Target, Users } from "@/components/icons";
import { METRIC_LABEL, rewardText, type ChallengeProgress } from "@/lib/blocks/challenge";

const fmt = (n: number) => n.toLocaleString("de-DE");
const when = (iso: string) => formatBerlinDateTime(new Date(iso), { dateStyle: "short", timeStyle: "short" });

export default function ChallengeCard({ p, compact = false }: { p: ChallengeProgress; compact?: boolean }) {
  const unit = METRIC_LABEL[p.metric];
  const pct = Math.min(100, p.goal > 0 ? (p.total / p.goal) * 100 : 0);
  const reached = p.total >= p.goal;
  const qualified = p.mine >= Math.max(1, p.minContribution);
  const reward = rewardText(p.rewardCoins, p.rewardRankPoints);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-teal-300 uppercase tracking-widest flex items-center gap-1">
            <Target className="w-3.5 h-3.5" /> Community-Challenge
          </p>
          {compact ? (
            <Link href={`/tournament/${p.eventId}`} className="block font-display text-lg font-bold text-white truncate hover:underline">{p.title}</Link>
          ) : (
            <p className="font-display text-lg font-bold text-white">Gemeinsam {fmt(p.goal)} {unit}</p>
          )}
        </div>
        <p className="text-[11px] text-gray-400 text-right shrink-0">
          {p.status === "upcoming" && <>Start {when(p.startAt)}</>}
          {p.status === "running" && <>bis {when(p.endAt)}</>}
          {p.status === "ended" && (p.succeeded === null ? "Wird abgerechnet …" : p.succeeded ? "Geschafft!" : "Verfehlt")}
        </p>
      </div>

      <div className="space-y-1">
        <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${reached ? "bg-gradient-to-r from-amber-400 to-amber-300" : "bg-gradient-to-r from-teal-500 to-teal-300"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white font-bold tabular-nums">
            {fmt(p.total)} <span className="text-gray-500 font-normal">/ {fmt(p.goal)} {unit}</span>
          </span>
          <span className="text-gray-400 tabular-nums flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {p.contributors}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Dein Beitrag</p>
          <p className="font-bold text-white tabular-nums">
            {fmt(p.mine)} {unit} {qualified && <span className="text-teal-300">✓</span>}
          </p>
          {!qualified && p.minContribution > 1 && <p className="text-[10px] text-gray-500">mind. {fmt(p.minContribution)} für die Belohnung</p>}
        </div>
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Belohnung bei Erfolg</p>
          <p className="font-bold text-white">{reward || "—"}</p>
        </div>
      </div>

      {!compact && p.top.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Top-Beiträge</p>
          {p.top.map((t, i) => (
            <Link key={t.userId} href={`/profile/${t.userId}`} className="flex items-center gap-2 text-xs hover:text-white">
              <span className="w-4 text-gray-500 tabular-nums">{i + 1}</span>
              {t.image ? (
                <Image src={t.image} alt="" width={20} height={20} className="rounded-full" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-white/10" />
              )}
              <span className="flex-1 truncate text-white font-semibold">{t.name}</span>
              <span className="tabular-nums text-gray-300">{fmt(t.value)}</span>
            </Link>
          ))}
        </div>
      )}

      {p.status !== "ended" && (
        <Link
          href="/gems/blocks"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-500/20 border border-teal-400/30 text-teal-100 text-sm font-semibold px-3 py-2 hover:bg-teal-500/30"
        >
          <Play className="w-4 h-4" /> {p.status === "upcoming" ? "Schon mal üben" : "Solo spielen & beitragen"}
        </Link>
      )}
      {!compact && <p className="text-[11px] text-gray-500">Es zählen alle gewerteten Solo-Läufe im Zeitraum. Versus-Runden zählen nicht.</p>}
    </div>
  );
}

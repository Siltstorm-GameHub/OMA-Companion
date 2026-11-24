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
    <div className="glass rounded-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-primary-fg uppercase tracking-widest flex items-center gap-1">
            <Target className="w-3.5 h-3.5" /> Community-Challenge
          </p>
          {compact ? (
            <Link href={`/tournament/${p.eventId}`} className="block font-display text-lg font-bold text-fg truncate hover:underline">{p.title}</Link>
          ) : (
            <p className="font-display text-lg font-bold text-fg">Gemeinsam {fmt(p.goal)} {unit}</p>
          )}
        </div>
        <p className="text-xs text-muted text-right shrink-0">
          {p.status === "upcoming" && <>Start {when(p.startAt)}</>}
          {p.status === "running" && <>bis {when(p.endAt)}</>}
          {p.status === "ended" && (p.succeeded === null ? "Wird abgerechnet …" : p.succeeded ? "Geschafft!" : "Verfehlt")}
        </p>
      </div>

      <div className="space-y-1">
        <div className="h-3 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${reached ? "bg-gradient-to-r from-amber-400 to-amber-300" : "bg-gradient-to-r from-teal-500 to-teal-300"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-fg font-bold tabular-nums">
            {fmt(p.total)} <span className="text-subtle font-normal">/ {fmt(p.goal)} {unit}</span>
          </span>
          <span className="text-muted tabular-nums flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {p.contributors}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-control bg-surface-2 px-3 py-2">
          <p className="text-[10px] text-subtle uppercase tracking-widest">Dein Beitrag</p>
          <p className="font-bold text-fg tabular-nums">
            {fmt(p.mine)} {unit} {qualified && <span className="text-primary-fg">✓</span>}
          </p>
          {!qualified && p.minContribution > 1 && <p className="text-[10px] text-subtle">mind. {fmt(p.minContribution)} für die Belohnung</p>}
        </div>
        <div className="rounded-control bg-surface-2 px-3 py-2">
          <p className="text-[10px] text-subtle uppercase tracking-widest">Belohnung bei Erfolg</p>
          <p className="font-bold text-fg">{reward || "—"}</p>
        </div>
      </div>

      {!compact && p.top.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-subtle uppercase tracking-widest">Top-Beiträge</p>
          {p.top.map((t, i) => (
            <Link key={t.userId} href={`/profile/${t.userId}`} className="flex items-center gap-2 text-xs hover:text-fg">
              <span className="w-4 text-subtle tabular-nums">{i + 1}</span>
              {t.image ? (
                <Image src={t.image} alt="" width={20} height={20} className="rounded-full" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-surface-3" />
              )}
              <span className="flex-1 truncate text-fg font-semibold">{t.name}</span>
              <span className="tabular-nums text-fg/85">{fmt(t.value)}</span>
            </Link>
          ))}
        </div>
      )}

      {p.status !== "ended" && (
        <Link
          href="/games/blocks/solo"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary-fg text-sm font-semibold px-3 py-2 hover:bg-primary/30"
        >
          <Play className="w-4 h-4" /> {p.status === "upcoming" ? "Schon mal üben" : "Solo spielen & beitragen"}
        </Link>
      )}
      {!compact && <p className="text-xs text-subtle">Es zählen alle gewerteten Solo-Läufe im Zeitraum. Versus-Runden zählen nicht.</p>}
    </div>
  );
}

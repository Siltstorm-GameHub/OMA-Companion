import Link from "next/link";
import type { ReactNode } from "react";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import { ChevronRight } from "@/components/icons";
import { formatBerlinDateTime } from "@/lib/time";
import { SOURCE_LABELS, type LedgerDay } from "@/lib/coin-ledger";

const fmt = (n: number) => n.toLocaleString("de-DE");

export type CoinSourceRow = { key: string; icon: ReactNode; title: string; hint: ReactNode; value: ReactNode; href: string; done?: boolean };

/** Münzen-Seite: eine Münzquelle mit deinem Stand, verlinkt dorthin, wo man sie holt. */
export function SourceRow({ s }: { s: CoinSourceRow }) {
  return (
    <li>
      <Link href={s.href} className="group flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
        <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border ${s.done ? "bg-white/[0.03] border-white/[0.06] text-gray-500" : "bg-amber-500/10 border-amber-500/15 text-amber-300"}`}>
          {s.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-white">{s.title}</span>
          <span className="block text-[11px] text-gray-500 truncate">{s.hint}</span>
        </span>
        <span className={`shrink-0 text-xs font-semibold tabular-nums ${s.done ? "text-gray-500" : "text-amber-300"}`}>{s.value}</span>
        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-600 group-hover:text-gray-300" />
      </Link>
    </li>
  );
}

/** Münzen-Seite: ein Tag im Verlauf mit Tagessummen je Währung. */
export function DayBlock({ day }: { day: LedgerDay }) {
  const sums = [
    day.coinsIn > 0 && <span key="in" className="text-amber-300">+{fmt(day.coinsIn)}</span>,
    day.coinsOut < 0 && <span key="out" className="text-red-300">−{fmt(-day.coinsOut)}</span>,
    day.rank !== 0 && <span key="rk" className="text-teal-300">{day.rank > 0 ? "+" : "−"}{fmt(Math.abs(day.rank))} Rang</span>,
  ].filter(Boolean);
  return (
    <li>
      <p className="flex items-center justify-between gap-2 pt-3 pb-1 text-[11px] font-semibold text-gray-500">
        <span>{day.label}</span>
        <span className="flex gap-2 tabular-nums">{sums}</span>
      </p>
      <ul className="divide-y divide-white/[0.04]">
        {day.items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-gray-200" title={i.label}>{i.label}</span>
              <span className="block text-[10px] text-gray-600">
                {SOURCE_LABELS[i.source]} · {formatBerlinDateTime(i.createdAt, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </span>
            <span className={`shrink-0 inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
              i.currency === "rank" ? "text-teal-300" : i.amount < 0 ? "text-red-300" : "text-amber-300"
            }`}>
              {i.amount > 0 ? "+" : "−"}{fmt(Math.abs(i.amount))}
              {i.currency === "rank" ? <RankPointsIcon size={12} /> : <CoinIcon size={12} />}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

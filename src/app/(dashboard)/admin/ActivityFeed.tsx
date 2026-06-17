"use client";
import { useState } from "react";
import { RelativeTime } from "@/components/RelativeTime";
import CoinIcon from "@/components/CoinIcon";
import { Star } from "lucide-react";

type Tx = {
  id: string;
  amount: number;
  reason: string;
  createdAt: Date;
  user: { name: string | null; username: string | null };
};

function txType(reason: string): "coins" | "rank" {
  if (reason.startsWith("[Rang-Punkte]") || reason.includes("(Rang-Punkte)") || reason.includes("Rang-Punkte")) return "rank";
  return "coins";
}

function cleanReason(reason: string) {
  return reason.replace(/^\[(Münzen|Rang-Punkte)\]\s*/, "");
}

type Filter = "all" | "coins" | "rank";

export default function ActivityFeed({ transactions }: { transactions: Tx[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = filter === "all"
    ? transactions
    : transactions.filter(tx => txType(tx.reason) === filter);

  return (
    <div>
      {/* Filter-Tabs */}
      <div className="flex items-center gap-1 mb-3">
        {(["all", "coins", "rank"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
              filter === f
                ? f === "rank"
                  ? "text-teal-300 bg-teal-500/15 border-teal-500/30"
                  : f === "coins"
                    ? "text-amber-300 bg-amber-500/15 border-amber-500/30"
                    : "text-white bg-white/10 border-white/15"
                : "text-gray-500 bg-transparent border-white/[0.06] hover:text-gray-300 hover:border-white/10"
            }`}
          >
            {f === "all"   && "Alle"}
            {f === "coins" && <><CoinIcon size={10} /> Münzen</>}
            {f === "rank"  && <><Star className="w-2.5 h-2.5" /> Rang-Punkte</>}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-600">{filtered.length} Einträge</span>
      </div>

      <div className="glass card-shine rounded-2xl overflow-y-auto divide-y divide-white/[0.04]" style={{ maxHeight: "480px" }}>
        {filtered.length === 0 && (
          <p className="text-sm text-gray-600 px-4 py-6 text-center">Keine Aktivitäten</p>
        )}
        {filtered.map((tx) => {
          const type = txType(tx.reason);
          const isPositive = tx.amount > 0;
          return (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-sm text-white font-medium">{tx.user.username ?? tx.user.name ?? "?"}</span>
                <span className="text-gray-500 text-sm ml-2">{cleanReason(tx.reason)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {type === "coins" ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/20">
                    <CoinIcon size={10} /> Münzen
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border text-teal-400 bg-teal-500/10 border-teal-500/20">
                    <Star className="w-2.5 h-2.5" /> Rang-Punkte
                  </span>
                )}
                <span className={`text-sm font-bold tabular-nums w-14 text-right ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                  {isPositive ? "+" : ""}{tx.amount}
                </span>
                <RelativeTime date={tx.createdAt} className="text-[10px] text-gray-600 w-16 text-right" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

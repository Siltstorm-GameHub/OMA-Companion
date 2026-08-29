"use client";

// ============================================
// Fortschritt + Upgrade — Duplikate/Münzen unter einer Karte
// ============================================
// Zeigt Fortschrittsbalken "X/Y Duplikate" + Münzkosten und bietet direkt den
// Upgrade-Button an, sobald beide Bedingungen erfüllt sind. Duplikate zählen
// kumulativ und werden beim Upgrade NICHT verbraucht (siehe upgrade.ts).
// Schwellen/Kosten kommen als Tabelle von oben (Server-Komponente battle-
// cards/page.tsx, siehe upgrade-admin-config.ts) statt fest verdrahtet zu
// sein — Admins können sie unter /admin/battle-cards überschreiben.

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowUpCircle } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { tableValueForLevel, type CardRarity, type UpgradeTable } from "@/lib/battle-cards/upgrade-config";

export default function DuplicateProgress({
  userCardId,
  rarity,
  level,
  duplicates,
  coins,
  duplicateThresholds,
  upgradeCosts,
  onUpgraded,
}: {
  userCardId: string;
  rarity: CardRarity;
  level: number;
  duplicates: number;
  coins: number;
  duplicateThresholds: UpgradeTable;
  upgradeCosts: UpgradeTable;
  onUpgraded: (fromLevel: number, newLevel: number, newCoins: number) => void;
}) {
  const [loading, setLoading] = useState(false);

  if (level >= 5) {
    return <p className="text-[10px] text-amber-400 text-center mt-1.5 font-semibold">★ Maximale Stufe</p>;
  }

  const needed = tableValueForLevel(duplicateThresholds, rarity, level)!;
  const cost = tableValueForLevel(upgradeCosts, rarity, level)!;
  const pct = Math.min(100, Math.round((duplicates / needed) * 100));
  const hasEnoughDuplicates = duplicates >= needed;
  const hasEnoughCoins = coins >= cost;
  const canUpgrade = hasEnoughDuplicates && hasEnoughCoins;

  async function handleUpgrade() {
    if (loading || !canUpgrade) return;
    setLoading(true);
    try {
      const res = await fetch("/api/battle-cards/upgrade-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCardId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upgrade fehlgeschlagen.");
        return;
      }
      onUpgraded(level, data.level, data.points);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-center justify-between text-[10px] tabular-nums">
        <span className={hasEnoughDuplicates ? "text-violet-300 font-semibold" : "text-gray-400"}>
          {duplicates}/{needed} Duplikate
        </span>
        <span className={`flex items-center gap-0.5 font-semibold ${hasEnoughCoins ? "text-amber-300" : "text-gray-500"}`}>
          {cost}
          <CoinIcon size={10} />
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: hasEnoughDuplicates ? "#8b5cf6" : "#52525b" }}
        />
      </div>

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={!canUpgrade || loading}
        title={!hasEnoughDuplicates ? "Nicht genug Duplikate" : !hasEnoughCoins ? "Nicht genug Münzen" : undefined}
        className={`w-full flex items-center justify-center gap-1 text-[10px] font-bold py-1 rounded-md transition-colors ${
          canUpgrade
            ? "bg-violet-500/25 text-violet-200 hover:bg-violet-500/35"
            : "bg-white/[0.03] text-gray-600 cursor-not-allowed"
        }`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ArrowUpCircle className="w-3 h-3" />
        )}
        {!hasEnoughDuplicates ? "Zu wenig Duplikate" : !hasEnoughCoins ? "Zu wenig Münzen" : "Upgrade"}
      </button>
    </div>
  );
}

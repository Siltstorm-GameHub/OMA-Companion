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
import { Loader2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import MobaIcon from "./MobaIcon";
import { tableValueForLevel, type CardRarity, type UpgradeTable } from "@/lib/battle-cards/upgrade-config";
import { scaleStatsForLevel } from "@/lib/battle-engine/stats";

function NextLevelPreview({
  baseHp,
  baseAttack,
  baseDefense,
  level,
}: {
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  level: number;
}) {
  const current = scaleStatsForLevel({ baseHp, baseAttack, baseDefense, level });
  const next = scaleStatsForLevel({ baseHp, baseAttack, baseDefense, level: level + 1 });
  const rows: { label: string; from: number; to: number }[] = [
    { label: "HP", from: current.hp, to: next.hp },
    { label: "ATK", from: current.attack, to: next.attack },
    { label: "DEF", from: current.defense, to: next.defense },
  ];
  return (
    <div className="rounded-lg bg-black/20 border border-[color:var(--moba-accent-line)] px-2.5 py-2 space-y-1">
      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Nach Stufe {level + 1}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between text-[10px] tabular-nums">
          <span className="text-gray-500 font-semibold">{r.label}</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">{r.from}</span>
            <MobaIcon name="chevronRight" className="w-2.5 h-2.5" />
            <span className="text-white font-bold">{r.to}</span>
            <span className="text-emerald-400 font-semibold">+{r.to - r.from}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DuplicateProgress({
  userCardId,
  rarity,
  level,
  duplicates,
  coins,
  duplicateThresholds,
  upgradeCosts,
  baseHp,
  baseAttack,
  baseDefense,
  onUpgraded,
}: {
  userCardId: string;
  rarity: CardRarity;
  level: number;
  duplicates: number;
  coins: number;
  duplicateThresholds: UpgradeTable;
  upgradeCosts: UpgradeTable;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
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
    <div className="mt-1.5 space-y-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] tabular-nums">
          <span className={hasEnoughDuplicates ? "text-[color:var(--moba-accent)] font-semibold" : "text-gray-400"}>
            {duplicates}/{needed} Duplikate
          </span>
          <span className={`flex items-center gap-0.5 font-semibold ${hasEnoughCoins ? "text-amber-300" : "text-gray-500"}`}>
            {cost}
            <CoinIcon size={10} />
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-black/20 border border-[color:var(--moba-accent-line)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: hasEnoughDuplicates ? "#e8961c" : "#52525b" }}
          />
        </div>
      </div>

      <NextLevelPreview baseHp={baseHp} baseAttack={baseAttack} baseDefense={baseDefense} level={level} />

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={!canUpgrade || loading}
        title={!hasEnoughDuplicates ? "Nicht genug Duplikate" : !hasEnoughCoins ? "Nicht genug Münzen" : undefined}
        className={`w-full flex items-center justify-center gap-1 text-[10px] font-bold py-1 rounded-md transition-colors ${
          canUpgrade
            ? "bg-orange-500/20 text-[color:var(--moba-accent)] hover:bg-orange-500/30"
            : "bg-black/20 text-gray-600 cursor-not-allowed"
        }`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <MobaIcon name="chevronUp" className="w-3 h-3" />
        )}
        {!hasEnoughDuplicates ? "Zu wenig Duplikate" : !hasEnoughCoins ? "Zu wenig Münzen" : "Upgrade"}
      </button>
    </div>
  );
}

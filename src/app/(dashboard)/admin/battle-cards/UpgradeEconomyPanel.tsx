"use client";

// ============================================
// Admin — Karten-Upgrade-Wirtschaft (Duplikate + Münzkosten)
// ============================================
// Editiert die gleiche Tabellenform wie upgrade-config.ts (Index 0 = Stufe
// 1→2 … Index 3 = Stufe 4→5), getrennt nach STANDARD/COMMUNITY. Speichert
// beide Tabellen zusammen per PATCH — siehe /api/admin/battle-cards/
// upgrade-economy und upgrade-admin-config.ts für die Ablage (BotConfig).

import { useState } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import type { CardRarity, UpgradeTable } from "@/lib/battle-cards/upgrade-config";

const STEP_LABELS = ["Stufe 1→2", "Stufe 2→3", "Stufe 3→4", "Stufe 4→5"];
const RARITIES: { key: CardRarity; label: string }[] = [
  { key: "STANDARD", label: "Standard-Karten" },
  { key: "COMMUNITY", label: "Community-Karten" },
];

function cloneTable(table: UpgradeTable): UpgradeTable {
  return { STANDARD: [...table.STANDARD], COMMUNITY: [...table.COMMUNITY] };
}

export function UpgradeEconomyPanel({
  initialDuplicateThresholds,
  initialUpgradeCosts,
}: {
  initialDuplicateThresholds: UpgradeTable;
  initialUpgradeCosts: UpgradeTable;
}) {
  const [thresholds, setThresholds] = useState(initialDuplicateThresholds);
  const [costs, setCosts] = useState(initialUpgradeCosts);
  const [saving, setSaving] = useState(false);

  function updateThreshold(rarity: CardRarity, index: number, value: number) {
    setThresholds((prev) => {
      const next = cloneTable(prev);
      next[rarity][index] = value;
      return next;
    });
  }

  function updateCost(rarity: CardRarity, index: number, value: number) {
    setCosts((prev) => {
      const next = cloneTable(prev);
      next[rarity][index] = value;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/battle-cards/upgrade-economy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateThresholds: thresholds, upgradeCosts: costs }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      setThresholds(data.duplicateThresholds);
      setCosts(data.upgradeCosts);
      toast.success("Upgrade-Wirtschaft gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-5">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Karten-Upgrade</p>
        <p className="text-xs text-gray-500 mt-1">
          Wie viele Duplikate und Münzen für jede Stufe nötig sind. Duplikate zählen kumulativ — die Karte muss
          insgesamt schon so viele Kopien erhalten haben, sie werden beim Upgrade nicht verbraucht.
        </p>
      </div>

      {RARITIES.map(({ key: rarity, label }) => (
        <div key={rarity} className="space-y-2">
          <p className="text-xs font-semibold text-gray-300">{label}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-gray-500 font-normal pb-1 pr-2 w-28"> </th>
                  {STEP_LABELS.map((s) => (
                    <th key={s} className="text-left text-gray-500 font-normal pb-1 px-1">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-gray-400 pr-2">Duplikate</td>
                  {thresholds[rarity].map((value, i) => (
                    <td key={i} className="px-1 pb-1">
                      <input
                        type="number"
                        min={0}
                        value={value}
                        onChange={(e) => updateThreshold(rarity, i, Math.max(0, Number(e.target.value) || 0))}
                        className="w-16 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-violet-500/50"
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="text-gray-400 pr-2">Münzen</td>
                  {costs[rarity].map((value, i) => (
                    <td key={i} className="px-1">
                      <input
                        type="number"
                        min={0}
                        value={value}
                        onChange={(e) => updateCost(rarity, i, Math.max(0, Number(e.target.value) || 0))}
                        className="w-16 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs tabular-nums focus:outline-none focus:border-amber-500/50"
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Speichert…" : "Speichern"}
      </button>
    </div>
  );
}

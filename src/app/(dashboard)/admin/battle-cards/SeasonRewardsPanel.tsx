"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import type { SeasonRewardConfig, SeasonPlacementReward } from "@/lib/battle-cards/season-reward-config";

const PLACES: { key: keyof SeasonRewardConfig; label: string }[] = [
  { key: "place1", label: "🥇 Platz 1" },
  { key: "place2", label: "🥈 Platz 2" },
  { key: "place3", label: "🥉 Platz 3" },
];

export function SeasonRewardsPanel({ initial }: { initial: SeasonRewardConfig }) {
  const [config, setConfig] = useState(initial);
  const [saving, setSaving] = useState(false);

  function updatePlace(key: keyof SeasonRewardConfig, field: keyof SeasonPlacementReward, value: number) {
    setConfig((c) => ({ ...c, [key]: { ...c[key], [field]: Math.max(0, value) } }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/battle-cards/season-rewards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      const data: SeasonRewardConfig = await res.json();
      setConfig(data);
      toast.success("Saison-Belohnungen gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Saisonabschluss — Belohnungen</p>
        <p className="text-xs text-gray-500 mt-1">
          Wird automatisch vergeben, sobald eine 3-Monats-Ranglisten-Saison endet. 0 = keine Belohnung dieser Art.
        </p>
      </div>
      <div className="space-y-3">
        {PLACES.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-white w-20 shrink-0">{label}</span>
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              Münzen
              <input
                type="number"
                min={0}
                value={config[key].coins}
                onChange={(e) => updatePlace(key, "coins", Number(e.target.value))}
                className="w-24 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              Rangpunkte
              <input
                type="number"
                min={0}
                value={config[key].rankPoints}
                onChange={(e) => updatePlace(key, "rankPoints", Number(e.target.value))}
                className="w-24 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
              />
            </label>
          </div>
        ))}
      </div>
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

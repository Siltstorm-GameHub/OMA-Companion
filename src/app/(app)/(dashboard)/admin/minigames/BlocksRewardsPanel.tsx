"use client";
// Admin: Belohnungen für Platz 1–3 einer Monatswertung (OMA Blocks — Münzen + Rang-Punkte)

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "@/components/icons";
import type { BlocksRewardsConfig } from "@/lib/blocks/rewards-config";
import { NumberInput } from "@/components/ui/NumberInput";

const PLACES = ["🥇 Platz 1", "🥈 Platz 2", "🥉 Platz 3"];

export function BlocksRewardsPanel({
  initial,
  endpoint = "/api/admin/blocks-rewards",
  ranking = "Solo-Monatswertung",
}: {
  initial: BlocksRewardsConfig;
  endpoint?: string;
  ranking?: string;
}) {
  const [config, setConfig] = useState<BlocksRewardsConfig>(initial);
  const [saving, setSaving] = useState(false);

  function set(i: number, key: "coins" | "rankPoints", value: number) {
    setConfig((prev) => prev.map((r, j) => (j === i ? { ...r, [key]: value } : r)) as BlocksRewardsConfig);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      setConfig(await res.json());
      toast.success("Belohnungen gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 space-y-4">
        <p className="text-xs text-gray-500">
          Wird beim Monatsabschluss (in der Nacht nach dem Monatswechsel) an die besten drei der {ranking}
          ausgezahlt. 0 = keine Belohnung dieser Art.
        </p>
        {config.map((r, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr_1fr] gap-3 items-end">
            <span className="text-sm font-semibold text-white pb-2">{PLACES[i]}</span>
            <Field label="Münzen" value={r.coins} onChange={(v) => set(i, "coins", v)} />
            <Field label="Rang-Punkte" value={r.rankPoints} onChange={(v) => set(i, "rankPoints", v)} />
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? "Speichert…" : "Speichern"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <NumberInput
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
      />
    </label>
  );
}

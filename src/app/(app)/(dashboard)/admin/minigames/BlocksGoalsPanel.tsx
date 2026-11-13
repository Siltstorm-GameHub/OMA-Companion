"use client";
// Admin: Monatsziele von OMA Blocks — Belohnung für alle, deren Monats-Bestwert eine Schwelle erreicht

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "@/components/icons";
import type { BlocksGoal } from "@/lib/blocks/goals-config";
import { NumberInput } from "@/components/ui/NumberInput";

export function BlocksGoalsPanel({ initial, max }: { initial: BlocksGoal[]; max: number }) {
  const [goals, setGoals] = useState<BlocksGoal[]>(initial);
  const [saving, setSaving] = useState(false);

  function set(i: number, key: keyof BlocksGoal, value: number) {
    setGoals((prev) => prev.map((g, j) => (j === i ? { ...g, [key]: value } : g)));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/blocks-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      });
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      setGoals(await res.json());
      toast.success("Monatsziele gespeichert");
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
          Jeder, dessen Solo-Bestwert im Monat eine Schwelle erreicht, bekommt beim Monatsabschluss die Belohnung der
          höchsten erreichten Schwelle — zusätzlich zur Top-3-Belohnung. Höchstens {max} Ziele; Ziele ohne
          Belohnung werden beim Speichern entfernt.
        </p>
        {goals.map((g, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
            <Field label="Ab Punkten" value={g.score} onChange={(v) => set(i, "score", v)} />
            <Field label="Münzen" value={g.coins} onChange={(v) => set(i, "coins", v)} />
            <Field label="Rang-Punkte" value={g.rankPoints} onChange={(v) => set(i, "rankPoints", v)} />
            <button
              type="button"
              onClick={() => setGoals((prev) => prev.filter((_, j) => j !== i))}
              className="mb-1 p-2 rounded-lg text-gray-500 hover:text-red-300 hover:bg-red-500/10"
              aria-label="Ziel entfernen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {goals.length < max && (
          <button
            type="button"
            onClick={() => setGoals((prev) => [...prev, { score: (prev[prev.length - 1]?.score ?? 0) + 25_000, coins: 100, rankPoints: 0 }])}
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-300 hover:text-teal-200"
          >
            <Plus className="w-3.5 h-3.5" /> Ziel hinzufügen
          </button>
        )}
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

"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Plus, Trash2 } from "lucide-react";
import type { PackKind, PackPrices, ShopConfig, WheelPrize } from "@/lib/shop-config";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

const TYPE_LABEL: Record<WheelPrize["type"], string> = {
  points: "Münzen",
  pack: "Karten-Pack",
  nothing: "Nichts",
};

const PACK_KIND_INFO: Record<PackKind, { label: string; hint: string }> = {
  STANDARD: { label: "Standard-Pack", hint: "1 Karte, sehr geringe Community-Chance" },
  PREMIUM: { label: "Premium-Pack", hint: "5 Karten, ca. 25% Chance auf 1 Community-Karte" },
  COMMUNITY: { label: "Community-Pack", hint: "1 Karte, garantiert Community" },
};
const PACK_KIND_ORDER: PackKind[] = ["STANDARD", "PREMIUM", "COMMUNITY"];

export function ShopConfigPanel({ initial }: { initial: ShopConfig }) {
  const [packPrices, setPackPrices] = useState<PackPrices>(initial.packPrices);
  const [prizes, setPrizes] = useState<WheelPrize[]>(initial.wheelPrizes);
  const [saving, setSaving] = useState(false);

  const totalWeight = prizes.reduce((s, p) => s + (p.weight > 0 ? p.weight : 0), 0);

  function updatePrize<K extends keyof WheelPrize>(id: string, key: K, value: WheelPrize[K]) {
    setPrizes((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  }

  function addPrize() {
    setPrizes((prev) => [...prev, { id: newId(), type: "points", value: "10", label: "10 Münzen", weight: 10 }]);
  }

  function removePrize(id: string) {
    setPrizes((prev) => prev.filter((p) => p.id !== id));
  }

  async function save() {
    if (prizes.length === 0) {
      toast.error("Mindestens ein Glücksrad-Preis erforderlich");
      return;
    }
    const labels = prizes.map((p) => p.label.trim());
    if (labels.some((l) => l.length === 0)) {
      toast.error("Alle Preise brauchen eine Beschriftung");
      return;
    }
    if (new Set(labels).size !== labels.length) {
      toast.error("Beschriftungen müssen eindeutig sein (das Rad erkennt Gewinne daran)");
      return;
    }
    if (prizes.some((p) => p.weight <= 0)) {
      toast.error("Gewichtung muss größer als 0 sein");
      return;
    }
    if (PACK_KIND_ORDER.some((kind) => packPrices[kind] <= 0)) {
      toast.error("Alle Pack-Preise müssen größer als 0 sein");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packPrices, wheelPrizes: prizes }),
      });
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      const data: ShopConfig = await res.json();
      setPackPrices(data.packPrices);
      setPrizes(data.wheelPrizes);
      toast.success("Shop-Einstellungen gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Pack-Preise ── */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Karten-Pack-Preise</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PACK_KIND_ORDER.map((kind) => (
            <label key={kind} className="block">
              <span className="text-xs text-gray-500">{PACK_KIND_INFO[kind].label}</span>
              <input
                type="number"
                min={1}
                value={packPrices[kind]}
                onChange={(e) =>
                  setPackPrices((prev) => ({ ...prev, [kind]: parseInt(e.target.value, 10) || 0 }))
                }
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
              />
              <span className="mt-1 block text-[10px] text-gray-600">{PACK_KIND_INFO[kind].hint}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Glücksrad-Preise ── */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Glücksrad-Preise</p>
          <button
            onClick={addPrize}
            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Preis hinzufügen
          </button>
        </div>

        <div className="space-y-2">
          {prizes.map((prize) => {
            const chance = totalWeight > 0 ? ((prize.weight / totalWeight) * 100).toFixed(1) : "0.0";
            return (
              <div key={prize.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <select
                  value={prize.type}
                  onChange={(e) => updatePrize(prize.id, "type", e.target.value as WheelPrize["type"])}
                  className="px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500/50"
                >
                  {(Object.keys(TYPE_LABEL) as WheelPrize["type"][]).map((t) => (
                    <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={prize.label}
                  onChange={(e) => updatePrize(prize.id, "label", e.target.value)}
                  placeholder="Beschriftung"
                  className="flex-1 min-w-[100px] px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500/50"
                />

                {prize.type === "points" && (
                  <input
                    type="number"
                    min={0}
                    value={prize.value}
                    onChange={(e) => updatePrize(prize.id, "value", e.target.value)}
                    placeholder="Münzen"
                    className="w-20 px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500/50"
                  />
                )}

                <input
                  type="number"
                  min={1}
                  value={prize.weight}
                  onChange={(e) => updatePrize(prize.id, "weight", parseInt(e.target.value, 10) || 0)}
                  title="Gewichtung"
                  className="w-16 px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500/50"
                />
                <span className="text-[10px] text-gray-500 w-12 tabular-nums shrink-0">{chance}%</span>

                <button
                  onClick={() => removePrize(prize.id)}
                  className="ml-auto text-gray-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-600">
          Gewichtung bestimmt die Gewinnchance relativ zu den anderen Preisen. Beschriftungen müssen eindeutig sein.
        </p>
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

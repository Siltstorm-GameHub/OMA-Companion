"use client";

// ============================================
// OMA Gems — Relikte ausrüsten (siehe lib/gems/relics.ts)
// ============================================
// Zeigt alle Relikte: eigene zum Auswählen (höchstens RELIC_SLOTS), fehlende mit dem Hinweis,
// welcher Turmwächter sie vergibt.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Check, Lock, Sparkles } from "@/components/icons";
import { guardianStageForRelic, RELIC_SLOTS, RELICS } from "@/lib/gems/relics";
import ErrorNotice from "./ErrorNotice";

export default function RelicPicker({ owned, equipped }: { owned: string[]; equipped: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(equipped);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ownedSet = new Set(owned);
  const changed = selected.length !== equipped.length || selected.some((id) => !equipped.includes(id));

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < RELIC_SLOTS ? [...cur, id] : cur));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/gems/relics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relicIds: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-300" /> Relikte
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Bis zu {RELIC_SLOTS} Relikte wirken in jedem Kampf. Jeder Turmwächter gibt beim ersten Sieg eins — wähle passend zur
          Wochen-Regel.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {RELICS.map((relic) => {
          const isOwned = ownedSet.has(relic.id);
          const isSelected = selected.includes(relic.id);
          const full = !isSelected && selected.length >= RELIC_SLOTS;
          return (
            <button
              key={relic.id}
              type="button"
              disabled={!isOwned || full}
              onClick={() => toggle(relic.id)}
              className={`glass rounded-xl px-3 py-2.5 text-left flex items-start gap-2.5 transition-colors disabled:cursor-not-allowed ${
                isSelected ? "ring-1 ring-violet-400/60 bg-violet-500/10" : isOwned ? "hover:bg-white/[0.04]" : "opacity-50"
              } ${full && isOwned ? "opacity-60" : ""}`}
            >
              <span
                className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${
                  isSelected ? "bg-violet-400 text-black" : "bg-white/[0.06] text-gray-500"
                }`}
              >
                {isSelected ? <Check className="w-3 h-3" /> : !isOwned ? <Lock className="w-3 h-3" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{relic.name}</span>
                <span className="block text-[11px] text-gray-400">
                  {isOwned ? relic.description : `Turmwächter auf Stufe ${guardianStageForRelic(relic.id)}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <ErrorNotice message={error} />}
      {owned.length > 0 && (
        <Button onClick={save} disabled={!changed} loading={saving} variant="accent" className="w-full">
          Relikte speichern
        </Button>
      )}
    </div>
  );
}

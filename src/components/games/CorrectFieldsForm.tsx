"use client";

import { useState } from "react";
import { toast } from "sonner";
import GameFieldsForm from "@/components/games/GameFieldsForm";
import { Button } from "@/components/ui/Button";
import { Check } from "@/components/icons";
import type { GameFields } from "@/lib/games/draft";
import { OVERWRITABLE_FIELDS } from "@/lib/games/edits";

/**
 * Angaben korrigieren: Spielerzahl, Rundenlänge, Plattformen und Crossplay (OVERWRITABLE_FIELDS) — auch wenn
 * schon etwas eingetragen ist. Läuft über dieselbe Route wie das Ergänzen (Protokoll, Tageslimit, das Team
 * kann zurücksetzen). Preise und Cover kommen von Steam und sind hier nicht änderbar.
 */
export default function CorrectFieldsForm({
  slug, current, onDone,
}: {
  slug: string;
  current: GameFields;
  /** Nach dem Speichern (mit den neuen Werten) bzw. beim Abbrechen (null) */
  onDone: (saved: GameFields | null) => void;
}) {
  const [value, setValue] = useState<GameFields>(current);
  const [saving, setSaving] = useState(false);
  const changed = OVERWRITABLE_FIELDS.filter(f => JSON.stringify(value[f]) !== JSON.stringify(current[f]));

  async function save() {
    setSaving(true);
    try {
      const fields = Object.fromEntries(changed.map(f => [f, value[f]]));
      const res = await fetch(`/api/games/${encodeURIComponent(slug)}/fill`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      toast.success("Danke fürs Korrigieren!");
      onDone(value);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <GameFieldsForm value={value} onChange={setValue} only={[...OVERWRITABLE_FIELDS]} />
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
        <p className="text-[11px] text-gray-500">Das Team sieht, wer was geändert hat, und kann es zurücksetzen.</p>
        <div className="flex gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onDone(null)}>Abbrechen</Button>
          <Button size="sm" onClick={save} loading={saving} disabled={changed.length === 0} icon={<Check className="w-3.5 h-3.5" />}>
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}

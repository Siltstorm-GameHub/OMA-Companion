"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GameFieldsForm from "@/components/games/GameFieldsForm";
import { Button } from "@/components/ui/Button";
import { Check, Lightbulb } from "@/components/icons";
import type { GameFields } from "@/lib/games/draft";
import { FIELD_LABELS, isEmptyValue, type FillableField } from "@/lib/games/edits";

/**
 * "Fehlt noch: … — weißt du's?" Mitglieder füllen leere Angaben; vorhandene bleiben unangetastet.
 */
export default function MissingFieldsPanel({ slug, current, missing }: { slug: string; current: GameFields; missing: FillableField[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<GameFields>(current);
  const [saving, setSaving] = useState(false);

  // Spieleranzahl als ein Punkt zählen
  const labels = [...new Set(missing.map(f => (f === "minPlayers" || f === "maxPlayers" ? "Spieleranzahl" : FIELD_LABELS[f])))];
  const changed = missing.filter(f => !isEmptyValue(value[f]));

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
      toast.success("Danke fürs Ergänzen!");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="flex-1 min-w-0 text-xs text-gray-300">
          <span className="text-gray-500">Fehlt noch:</span> {labels.join(", ")} — weißt du&apos;s?
        </p>
        {!open && <Button size="sm" variant="accent" onClick={() => setOpen(true)}>Ergänzen</Button>}
      </div>
      {open && (
        <div className="space-y-4 pt-1">
          <GameFieldsForm value={value} onChange={setValue} only={missing} />
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
            <p className="text-[11px] text-gray-500">Du kannst nur leere Angaben füllen. Das Team sieht, wer was ergänzt hat.</p>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setValue(current); }}>Abbrechen</Button>
              <Button size="sm" onClick={save} loading={saving} disabled={changed.length === 0} icon={<Check className="w-3.5 h-3.5" />}>Speichern</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

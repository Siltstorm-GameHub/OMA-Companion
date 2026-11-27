"use client";
// Event-Vorschlag schreiben (Community-Board, Verfassen-Feld): was für ein Event, welches Spiel, wann ungefähr.
// Wer vorschlägt, ist automatisch "dabei". Organisieren kann es danach jedes Mitglied ("Ich organisiere das").

import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import GameNameInput from "@/components/GameNameInput";

const FIELD = "w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none";

export default function ProposalForm({ initialGame, onDone }: { initialGame?: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [game, setGame] = useState(initialGame ?? "");
  const [description, setDescription] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/event-proposals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, game, preferredTime }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
      toast.success("Vorschlag veröffentlicht — jetzt können andere sagen, ob sie dabei wären");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Du wünschst dir ein Event? Schlag es vor — andere sagen „Ich wäre dabei“, und wer Lust hat, organisiert es.</p>
      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="Was für ein Event? z. B. „Mario-Kart-Turnier am Wochenende“" className={FIELD} />
      <div className="grid gap-2 sm:grid-cols-2">
        <GameNameInput value={game} onChange={v => setGame(v.slice(0, 80))} placeholder="Spiel (optional)" className={FIELD} />
        <input value={preferredTime} onChange={e => setPreferredTime(e.target.value)} maxLength={80} placeholder="Wunschtermin (optional), z. B. „Freitagabend“" className={FIELD} />
      </div>
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={2000}
        placeholder="Wie soll es ablaufen? Modus, Teams, Preise … ein paar Sätze reichen." className={`${FIELD} resize-y`} />
      <div className="flex justify-end">
        <Button loading={busy} disabled={!title.trim() || !description.trim()} icon={<ChevronRight className="size-3.5" />} onClick={submit}>Vorschlagen</Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Flame } from "@/components/icons";

const NOTE_MAX = 140; // wie TIP_NOTE_MAX in lib/games/drop.ts

/** "Für den Drop empfehlen" — Spiel für den GameSwipe-Drop der Woche vorschlagen (Detailseite). */
export default function TipPanel({ slug, initial, isModerator }: {
  slug: string;
  /** Offene Empfehlung zu diesem Spiel (von wem auch immer) */
  initial: "approved" | "pending" | null;
  isModerator: boolean;
}) {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(slug)}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Empfehlen fehlgeschlagen");
      setState(data.status);
      setOpen(false);
      toast.success(data.status === "approved" ? "Kommt in den nächsten Drop der Woche" : "Danke! Das Team schaut sich deine Empfehlung an");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Empfehlen fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Flame className="w-4 h-4 text-orange-400 shrink-0" />
        <p className="flex-1 min-w-0 text-xs text-gray-300">
          {state === "approved"
            ? <>Für den nächsten <span className="text-white font-semibold">Drop der Woche</span> in GameSwipe vorgemerkt.</>
            : state === "pending"
              ? <>Für den Drop der Woche empfohlen <span className="text-gray-500">— das Team schaut drüber.</span></>
              : <>Sollten mehr Leute das Spiel kennen? <span className="text-gray-500">Empfiehl es für den Drop der Woche in GameSwipe.</span></>}
        </p>
        {state === null && !open && <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Empfehlen</Button>}
      </div>
      {open && (
        <div className="space-y-2">
          <input
            value={note}
            onChange={e => setNote(e.target.value.slice(0, NOTE_MAX))}
            placeholder="Warum? (optional, steht auf der Karte)"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-600">
              {isModerator ? "Als Moderator kommt es direkt in den nächsten Drop." : "Das Team prüft Empfehlungen, bevor sie im Drop landen."}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Abbrechen</Button>
              <Button size="sm" onClick={submit} disabled={saving}>Empfehlen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

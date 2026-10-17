"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Info, Loader2, Tv2 } from "@/components/icons";
import type { EventModeReason } from "@/lib/overlay-state";

/**
 * Erklärt, warum das Overlay gerade KEINEN Turniermodus zeigt, obwohl ein Event läuft (der User ist
 * dort weder Spieler noch Streamer) — statt still "Normales Streamen" anzuzeigen. Als Streamer
 * anmelden schaltet den Turniermodus sofort ein.
 */
export default function EventModeHint({ reason, onChanged }: { reason: EventModeReason | null; onChanged?: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!reason || reason.running.length === 0) return null;

  async function registerAsStreamer(eventId: string) {
    setBusy(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/stream-register`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Anmeldung fehlgeschlagen"); return; }
      toast.success("Als Streamer angemeldet – dein Overlay wechselt in wenigen Sekunden in den Turniermodus");
      onChanged?.();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {reason.running.map(e => (
        <div key={e.id} className="flex gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p>
              <Link href={`/tournament/${e.id}`} className="font-semibold hover:underline">{e.title}</Link> läuft gerade.{" "}
              Du bist dort weder als Spieler noch als Streamer angemeldet, deshalb bleibt dein Overlay im normalen Modus.
            </p>
            <button
              onClick={() => registerAsStreamer(e.id)}
              disabled={busy === e.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 px-2.5 py-1 font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
            >
              {busy === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tv2 className="w-3.5 h-3.5" />}
              Als Streamer anmelden
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";
import { useState } from "react";
import { Camera } from "@/components/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

/** "Bild anfragen": kurzer Wunsch an die Fotografen (für Werbe-Posts, Anleitungen, Ideen …). Der Fotograf erfüllt ihn per Upload. */
export default function PhotoRequestButton({ eventId, defaultText = "", label = "Bild bei den Fotografen anfragen" }: {
  eventId?: string; defaultText?: string; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(defaultText);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/community-jobs/photo-requests", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: eventId || undefined, description: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
      toast.success("Bildwunsch an die Fotografen geschickt");
      setOpen(false);
      setText(defaultText);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-teal-400 transition-colors">
        <Camera className="w-3 h-3" /> {label}
      </button>
    );
  }
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/10 p-2 space-y-1.5">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={300} placeholder="Welches Bild brauchst du?"
        className="w-full resize-none bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
        <Button size="sm" loading={busy} disabled={!text.trim()} onClick={send}>Anfragen</Button>
      </div>
    </div>
  );
}

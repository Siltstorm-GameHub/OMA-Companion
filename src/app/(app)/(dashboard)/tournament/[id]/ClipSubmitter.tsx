"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Clapperboard, Trash2, Loader2 } from "@/components/icons";

interface Props {
  eventId: string;
  existingClipUrl: string | null;
}

export default function ClipSubmitter({ eventId, existingClipUrl }: Props) {
  const [clipUrl, setClipUrl] = useState(existingClipUrl ?? "");
  const [saved,   setSaved]   = useState(existingClipUrl);
  const [saving,  setSaving]  = useState(false);
  const [open,    setOpen]    = useState(false);

  async function submit() {
    if (!clipUrl.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/events/${eventId}/clip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipUrl: clipUrl.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(clipUrl.trim());
      setOpen(false);
      toast.success("Clip eingereicht!");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Fehler");
    }
  }

  async function remove() {
    setSaving(true);
    await fetch(`/api/events/${eventId}/clip`, { method: "DELETE" });
    setSaving(false);
    setSaved(null);
    setClipUrl("");
    toast.success("Clip entfernt");
  }

  if (saved && !open) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <a href={saved} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#9146ff] hover:text-purple-300 transition-colors">
          <Clapperboard className="w-3.5 h-3.5" />
          Dein eingereichte Clip ansehen ↗
        </a>
        <button onClick={() => setOpen(true)} className="text-xs text-subtle hover:text-muted transition-colors underline">
          ändern
        </button>
        <button onClick={remove} disabled={saving} className="text-xs text-subtle hover:text-danger transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={clipUrl}
          onChange={e => setClipUrl(e.target.value)}
          placeholder="https://www.twitch.tv/clips/..."
          className="flex-1 rounded-control px-3 py-2 text-sm text-fg bg-surface-2 border border-line focus:border-primary outline-none placeholder:text-subtle"
        />
        <button onClick={submit} disabled={saving || !clipUrl.trim()}
          className="flex min-h-10 items-center gap-1.5 px-4 rounded-control text-sm font-semibold bg-[#9146ff]/15 border border-[#9146ff]/25 text-purple-300 hover:bg-[#9146ff]/25 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clapperboard className="w-3.5 h-3.5" />}
          Einreichen
        </button>
      </div>
      {saved && (
        <button onClick={() => setOpen(false)} className="text-xs text-subtle hover:text-muted transition-colors">
          Abbrechen
        </button>
      )}
    </div>
  );
}

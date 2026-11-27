"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, ImagePlus } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import GameNameInput from "@/components/GameNameInput";
import PhotoRequestButton from "@/components/community-jobs/PhotoRequestButton";
import MediaPickerPanel from "@/components/community-jobs/MediaPickerPanel";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Etwas ist schiefgelaufen");
  if (typeof data?.notice === "string" && data.notice) toast.warning(data.notice);
  return data as T;
}

/** Coach: Einsteiger-Anleitung fürs Community-Board (wird per Daumen-hoch bewertet, zählt in den Score). */
export default function GuideForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);

  function insertImage(asset: { url: string; caption: string | null }) {
    const alt = (asset.caption ?? "Bild").replace(/[\[\]]/g, "");
    setBody(b => `${b.trimEnd()}${b.trim() ? "\n\n" : ""}![${alt}](${asset.url})\n\n`);
    setPicker(false);
  }

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/coach/guides", { method: "POST", body: JSON.stringify({ title, game: game || undefined, bodyMarkdown: body }) });
      toast.success("Anleitung veröffentlicht");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Titel, z.B. „Erste Schritte in R6 Siege“"
        className="w-full bg-surface-2 border border-line rounded-control px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary" />
      <div className="space-y-1">
        <GameNameInput value={game} onChange={v => setGame(v.slice(0, 40))} placeholder="Spiel (optional) — sein Cover erscheint bei deiner Anleitung"
          className="w-full bg-line border border-line-strong rounded-lg py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary/40" />
      </div>
      <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={6000} rows={9} placeholder="Deine Tipps und Schritte — Links werden im Board klickbar, **fett** und Bilder sind möglich."
        className="w-full bg-surface-2 border border-line rounded-control px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary resize-none" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setPicker(v => !v)} aria-expanded={picker} className="inline-flex items-center gap-1 text-xs text-subtle hover:text-primary transition-colors">
          <ImagePlus className="w-3 h-3" /> Bild aus der Mediathek einfügen
        </button>
        <PhotoRequestButton requesterJob="coach" defaultText={game ? `Screenshot für meine Anleitung zu ${game}` : ""} />
      </div>
      {picker && <MediaPickerPanel onPick={insertImage} onClose={() => setPicker(false)} />}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        <Button loading={busy} disabled={!title.trim() || !body.trim()} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>Veröffentlichen</Button>
      </div>
    </div>
  );
}


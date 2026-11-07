"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Images, Loader2, Upload, Wand2, X } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import StudioEditor from "./StudioEditor";
import { AlbumSelect, MonthCollageBuilder, useAlbums } from "./FotografTools";
import { prepareUploadImage } from "@/lib/studio-templates";
import { CLIP_ALLOWED_TYPES, CLIP_EXTENSION_BY_MIME, CLIP_MAX_BYTES, CLIP_UPLOAD_PREFIX, isVideoUrl } from "@/lib/upload-limits";
import { POST_MEDIA_MAX } from "@/lib/post-display";
import ClipTrimmer from "./ClipTrimmer";
import TrimmedVideo from "./TrimmedVideo";

/** Bild/Clip eines Beitrags im Editor: `id` = schon gespeichert, sonst frisch hochgeladen. */
export interface EditorMedia {
  id?: string; url: string; caption: string; type?: string;
  /** Clips: Schnitt-Bereich (Sekunden) und Vorschaubild. */
  clipStart?: number | null; clipEnd?: number | null; posterUrl?: string | null;
}

const SMALL_INPUT = "bg-white/[0.04] border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40";

export async function uploadBlob(blob: Blob, name: string): Promise<string> {
  const body = new FormData();
  body.append("file", blob, name);
  body.append("kind", "community-job-asset");
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload fehlgeschlagen");
  return data.url;
}

/** Video-Clip direkt in den Blob-Store hochladen (große Dateien, mit Fortschritt). */
export function ClipUploadField({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File) {
    if (!CLIP_ALLOWED_TYPES.includes(file.type as (typeof CLIP_ALLOWED_TYPES)[number])) {
      toast.error("Nur MP4, WebM oder MOV erlaubt");
      return;
    }
    if (file.size > CLIP_MAX_BYTES) {
      toast.error(`Datei zu groß (max. ${Math.round(CLIP_MAX_BYTES / 1_000_000)} MB)`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const ext = CLIP_EXTENSION_BY_MIME[file.type as (typeof CLIP_ALLOWED_TYPES)[number]];
      const blob = await upload(`${CLIP_UPLOAD_PREFIX}${crypto.randomUUID()}.${ext}`, file, {
        access: "public",
        handleUploadUrl: "/api/community-jobs/media/clip-upload",
        contentType: file.type,
        onUploadProgress: p => setProgress(p.percentage),
      });
      onUploaded(blob.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-xl py-6 cursor-pointer hover:border-teal-500/30 transition-colors">
      {uploading ? <Loader2 className="w-5 h-5 text-gray-500 animate-spin" /> : <Upload className="w-5 h-5 text-gray-500" />}
      <span className="text-xs text-gray-500">{uploading ? `Wird hochgeladen… ${Math.round(progress)}%` : "Video-Clip auswählen"}</span>
      {uploading && (
        <div className="w-40 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-teal-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <span className="text-[10px] text-gray-700">MP4, WebM oder MOV — max. {Math.round(CLIP_MAX_BYTES / 1_000_000)} MB</span>
      <input type="file" accept={CLIP_ALLOWED_TYPES.join(",")} className="hidden" disabled={uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </label>
  );
}

type AddMode = null | "clip" | "studio" | "collage";

/**
 * Bilder & Clips eines Beitrags: mehrere Bilder auf einmal (automatisch verkleinert, optional mit
 * Wasserzeichen), Video-Clip, im Studio gestaltete Grafik oder Monats-Collage. Bildunterschriften,
 * Reihenfolge und Album sind frei wählbar — die Medien landen zusätzlich in der Mediathek.
 */
export default function PostMediaEditor({ media, onChange, albumId, onAlbumChange, startMode }: {
  media: EditorMedia[]; onChange: (next: EditorMedia[]) => void;
  albumId: string; onAlbumChange: (id: string) => void;
  /** Direkt mit einem Werkzeug starten (z.B. "Bilder des Monats" → Collage). */
  startMode?: AddMode;
}) {
  const { data: session } = useSession();
  const { albums } = useAlbums();
  const [mode, setMode] = useState<AddMode>(startMode ?? null);
  const [watermark, setWatermark] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [trimming, setTrimming] = useState<string | null>(null); // URL des Clips im Schnitt
  const trimItem = media.find(m => m.url === trimming) ?? null;
  const free = POST_MEDIA_MAX - media.length;

  function add(items: EditorMedia[]) {
    onChange([...media, ...items].slice(0, POST_MEDIA_MAX));
  }

  async function addImages(list: FileList | null) {
    if (!list) return;
    const files = [...list].filter(f => f.type.startsWith("image/")).slice(0, free);
    if (files.length < list.length) toast.error(`Nur Bilder, höchstens ${POST_MEDIA_MAX} pro Beitrag (Clips einzeln hochladen)`);
    if (files.length === 0) return;
    setProgress({ done: 0, total: files.length });
    const added: EditorMedia[] = [];
    const author = session?.user?.name ?? "OMA";
    for (const file of files) {
      try {
        const blob = await prepareUploadImage(file, { watermark: watermark ? `© ${author} · OMA` : undefined });
        added.push({ url: await uploadBlob(blob, `${crypto.randomUUID()}.jpg`), caption: "", type: "SCREENSHOT" });
      } catch {
        toast.error(`${file.name} konnte nicht hochgeladen werden`);
      }
      setProgress(p => (p ? { ...p, done: p.done + 1 } : p));
    }
    setProgress(null);
    add(added);
  }

  function move(index: number, delta: number) {
    const next = [...media];
    const [item] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(next.length, index + delta)), 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><Images className="w-3.5 h-3.5" /> Bilder &amp; Clips (optional, bis {POST_MEDIA_MAX})</p>
        {media.length > 0 && <AlbumSelect albums={albums} value={albumId} onChange={onAlbumChange} />}
      </div>

      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {media.map((m, i) => (
            <div key={m.id ?? m.url} className="rounded-lg bg-white/[0.03] border border-white/10 p-1.5 space-y-1">
              <div className="relative">
                {isVideoUrl(m.url)
                  ? <TrimmedVideo url={m.url} clipStart={m.clipStart} clipEnd={m.clipEnd} posterUrl={m.posterUrl} controls={false} muted className="w-full aspect-video object-cover rounded" />
                  // eslint-disable-next-line @next/next/no-img-element -- Upload-Vorschau, Blob-Host
                  : <img src={m.url} alt="" className="w-full aspect-video object-cover rounded" />}
                <button type="button" onClick={() => onChange(media.filter((_, j) => j !== i))} aria-label="Entfernen"
                  className="absolute top-1 right-1 rounded bg-black/70 p-0.5 text-gray-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
              </div>
              <input value={m.caption} maxLength={300} placeholder="Bildunterschrift" aria-label="Bildunterschrift"
                onChange={e => onChange(media.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
                className={`w-full ${SMALL_INPUT}`} />
              {isVideoUrl(m.url) && (
                <button type="button" onClick={() => setTrimming(trimming === m.url ? null : m.url)}
                  className="w-full text-[10px] text-gray-400 hover:text-teal-300 text-left">
                  ✂ {m.clipStart != null || m.clipEnd != null || m.posterUrl ? "Schnitt/Vorschaubild ändern" : "Schneiden & Vorschaubild"}
                </button>
              )}
              {media.length > 1 && (
                <div className="flex justify-between">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Nach vorne" className="text-gray-500 hover:text-white disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={i === media.length - 1} onClick={() => move(i, 1)} aria-label="Nach hinten" className="text-gray-500 hover:text-white disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {trimItem && (
        <ClipTrimmer key={trimItem.url} url={trimItem.url} clipStart={trimItem.clipStart ?? null} clipEnd={trimItem.clipEnd ?? null}
          posterUrl={trimItem.posterUrl ?? null} uploadPoster={blob => uploadBlob(blob, `${crypto.randomUUID()}.jpg`)}
          onCancel={() => setTrimming(null)}
          onSave={v => { onChange(media.map(x => (x.url === trimItem.url ? { ...x, ...v } : x))); setTrimming(null); }} />
      )}

      {free > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <label className={`inline-flex items-center gap-1.5 text-xs rounded-lg border border-white/10 px-3 py-1.5 cursor-pointer hover:border-teal-500/30 ${progress ? "opacity-50 pointer-events-none" : "text-gray-300"}`}>
            {progress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {progress ? `Lädt ${progress.done}/${progress.total}…` : "Bilder hochladen"}
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
              onChange={e => { addImages(e.target.files); e.target.value = ""; }} />
          </label>
          <Button size="sm" variant={mode === "clip" ? "primary" : "outline"} onClick={() => setMode(mode === "clip" ? null : "clip")}>Clip</Button>
          <Button size="sm" variant={mode === "studio" ? "primary" : "outline"} icon={<Wand2 className="w-3.5 h-3.5" />} onClick={() => setMode(mode === "studio" ? null : "studio")}>Im Studio gestalten</Button>
          <Button size="sm" variant={mode === "collage" ? "primary" : "outline"} onClick={() => setMode(mode === "collage" ? null : "collage")}>Monats-Collage</Button>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500" title="Blendet „© Name · OMA“ unten rechts in hochgeladene Bilder ein">
            <input type="checkbox" checked={watermark} onChange={e => setWatermark(e.target.checked)} /> Wasserzeichen
          </label>
        </div>
      )}

      {mode === "clip" && <ClipUploadField onUploaded={url => { add([{ url, caption: "", type: "CLIP" }]); setMode(null); }} />}
      {mode === "studio" && <StudioEditor allowWatermark onExported={url => { add([{ url, caption: "", type: "GRAPHIC" }]); setMode(null); }} />}
      {mode === "collage" && <MonthCollageBuilder onExported={(url, caption) => { add([{ url, caption, type: "COLLAGE" }]); setMode(null); }} />}
    </div>
  );
}

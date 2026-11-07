"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Camera, Check, X } from "@/components/icons";

/** Sekunden → "m:ss.s" */
function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

/**
 * Highlight-Schnitt im Browser: Start und Ende festlegen (die Datei bleibt unverändert, abgespielt wird nur der
 * Bereich) und ein Vorschaubild aus dem aktuellen Bild erzeugen. `uploadPoster` lädt das JPEG hoch.
 */
export default function ClipTrimmer({
  url, clipStart, clipEnd, posterUrl, uploadPoster, onSave, onCancel,
}: {
  url: string; clipStart: number | null; clipEnd: number | null; posterUrl: string | null;
  uploadPoster: (blob: Blob) => Promise<string>;
  onSave: (v: { clipStart: number | null; clipEnd: number | null; posterUrl: string | null }) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(clipStart ?? 0);
  const [end, setEnd] = useState<number | null>(clipEnd);
  const [poster, setPoster] = useState(posterUrl);
  const [busy, setBusy] = useState(false);
  const effectiveEnd = end ?? duration;

  const now = () => ref.current?.currentTime ?? 0;
  const seek = (t: number) => { if (ref.current) ref.current.currentTime = t; };

  async function capturePoster() {
    const v = ref.current;
    if (!v || !v.videoWidth) return;
    setBusy(true);
    try {
      const scale = Math.min(1, 1280 / v.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(v.videoWidth * scale);
      canvas.height = Math.round(v.videoHeight * scale);
      canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/jpeg", 0.85));
      if (!blob) throw new Error("Bild konnte nicht erzeugt werden");
      setPoster(await uploadPoster(blob));
      toast.success("Vorschaubild gesetzt");
    } catch (err) {
      toast.error(err instanceof Error && err.name === "SecurityError"
        ? "Vorschaubild aus diesem Clip nicht möglich (Datei-Freigabe)" : err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const s = start > 0.05 ? Math.round(start * 10) / 10 : null;
    const e = end != null && duration > 0 && end < duration - 0.05 ? Math.round(end * 10) / 10 : null;
    if (e != null && e <= (s ?? 0)) { toast.error("Das Ende muss nach dem Start liegen"); return; }
    onSave({ clipStart: s, clipEnd: e, posterUrl: poster });
  }

  return (
    <div className="rounded-lg border border-teal-500/20 bg-white/[0.03] p-2 space-y-2">
      <video ref={ref} src={url} crossOrigin="anonymous" controls playsInline preload="metadata" className="w-full max-h-72 rounded bg-black"
        onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={e => { if (end != null && e.currentTarget.currentTime > end) e.currentTarget.pause(); }} />

      {duration > 0 && (
        <div className="space-y-1.5">
          {/* Schnitt-Bereich als Balken */}
          <div className="relative h-2 rounded-full bg-white/10">
            <div className="absolute inset-y-0 rounded-full bg-teal-400/60"
              style={{ left: `${(start / duration) * 100}%`, width: `${(Math.max(0, effectiveEnd - start) / duration) * 100}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
            <label className="space-y-0.5">
              Start {fmt(start)}
              <input type="range" min={0} max={duration} step={0.1} value={start} className="w-full"
                onChange={e => { const t = Number(e.target.value); setStart(Math.min(t, effectiveEnd - 0.5)); seek(t); }} />
            </label>
            <label className="space-y-0.5">
              Ende {fmt(effectiveEnd)}
              <input type="range" min={0} max={duration} step={0.1} value={effectiveEnd} className="w-full"
                onChange={e => { const t = Number(e.target.value); setEnd(Math.max(t, start + 0.5)); seek(t); }} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setStart(Math.min(now(), effectiveEnd - 0.5))}>Start = jetzt</Button>
            <Button size="sm" variant="outline" onClick={() => setEnd(Math.max(now(), start + 0.5))}>Ende = jetzt</Button>
            <Button size="sm" variant="ghost" onClick={() => { seek(start); ref.current?.play().catch(() => {}); }}>Ausschnitt abspielen</Button>
            <Button size="sm" variant="ghost" onClick={() => { setStart(0); setEnd(null); }}>Zurücksetzen</Button>
            <span className="text-[10px] text-gray-600">Länge {fmt(Math.max(0, effectiveEnd - start))}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" loading={busy} icon={<Camera className="w-3.5 h-3.5" />} onClick={capturePoster}>Aktuelles Bild als Vorschaubild</Button>
        {poster && (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
            {/* eslint-disable-next-line @next/next/no-img-element -- Upload-Vorschau, Blob-Host */}
            <img src={poster} alt="Vorschaubild" className="h-8 rounded" />
            <button type="button" aria-label="Vorschaubild entfernen" className="hover:text-red-400" onClick={() => setPoster(null)}><X className="w-3 h-3" /></button>
          </span>
        )}
      </div>
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
        <Button size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={save}>Übernehmen</Button>
      </div>
    </div>
  );
}

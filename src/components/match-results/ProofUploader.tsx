"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, X, Loader2 } from "@/components/icons";
import FileDropZone from "@/components/FileDropZone";
import ImageLightbox from "@/components/ImageLightbox";

/** Mehrere Screenshots als Ergebnis-Nachweis hochladen (Upload-Kind "match-proof"). */
export default function ProofUploader({
  value,
  onChange,
  max = 4,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, max - value.length)) {
        const body = new FormData();
        body.append("file", file);
        body.append("kind", "match-proof");
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          toast.error(data.error ?? "Upload fehlgeschlagen");
          break;
        }
        added.push(data.url);
      }
    } catch {
      toast.error("Upload fehlgeschlagen — Netzwerkfehler");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      if (added.length) onChange([...value, ...added]);
    }
  }

  return (
    <FileDropZone onFiles={handleFiles} disabled={uploading || value.length >= max} label="Screenshot hier ablegen" className="rounded-control">
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-line-strong">
            <button type="button" onClick={() => setViewer(i)} aria-label="Screenshot groß ansehen" className="block size-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Screenshot" className="w-full h-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-600"
              aria-label="Screenshot entfernen"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-lg border border-dashed border-line-strong text-gray-400 hover:text-primary-fg hover:border-primary/40 flex flex-col items-center justify-center gap-1 text-xs disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            Screenshot
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {value.length < max && <p className="text-xs text-subtle">Tipp: Screenshots einfach hierher ziehen oder mit Strg+V einfügen.</p>}
      {viewer !== null && <ImageLightbox images={value} start={viewer} onClose={() => setViewer(null)} />}
    </div>
    </FileDropZone>
  );
}

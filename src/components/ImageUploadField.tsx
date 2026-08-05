"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageUploadFieldProps {
  /** Aktuelle Bild-URL (oder leer). */
  value: string;
  onChange: (url: string) => void;
  /** Muss einem `kind` aus /api/upload entsprechen — die Route prüft dagegen. */
  kind: "event-cover" | "profile-banner" | "badge" | "collectible";
  label?: string;
  hint?: string;
  /** Seitenverhältnis der Vorschau, z.B. "16/9" oder "4/1". */
  previewAspect?: string;
}

/**
 * Bild hochladen oder URL einfügen.
 *
 * Beide Wege bleiben bewusst offen: Uploads brauchen einen konfigurierten
 * Blob-Store, und ohne den (BLOB_READ_WRITE_TOKEN fehlt → 503) wäre das Feld
 * sonst tot. Die URL-Eingabe entspricht ausserdem dem, was die
 * Collectibles-Verwaltung heute schon macht.
 */
export default function ImageUploadField({
  value,
  onChange,
  kind,
  label = "Bild",
  hint,
  previewAspect = "16/9",
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);

      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Upload fehlgeschlagen");
        return;
      }
      setPreviewFailed(false);
      onChange(data.url);
      toast.success("Bild hochgeladen");
    } catch {
      toast.error("Upload fehlgeschlagen — Netzwerkfehler");
    } finally {
      setUploading(false);
      // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400">{label}</label>

      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => { setPreviewFailed(false); onChange(e.target.value); }}
          placeholder="https://… oder Datei hochladen"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white placeholder:text-gray-600 focus:border-teal-500/40 focus:outline-none"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.1] bg-white/[0.03] text-xs font-medium text-gray-300 hover:border-teal-500/40 disabled:opacity-50 transition-colors"
        >
          {uploading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Lädt…</>
            : <><Upload className="w-3.5 h-3.5" /> Hochladen</>}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => { setPreviewFailed(false); onChange(""); }}
            title="Bild entfernen"
            className="shrink-0 inline-flex items-center px-2.5 py-2 rounded-xl border border-white/[0.1] bg-white/[0.03] text-gray-400 hover:border-red-500/40 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {hint && <p className="text-[10px] text-gray-600">{hint}</p>}

      {value && !previewFailed && (
        <div
          className="rounded-xl overflow-hidden border border-white/[0.1] bg-black/20"
          style={{ aspectRatio: previewAspect }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau beliebiger URLs, next/image bräuchte dafür remotePatterns pro Host */}
          <img
            src={value}
            alt="Vorschau"
            className="w-full h-full object-cover"
            onError={() => setPreviewFailed(true)}
          />
        </div>
      )}

      {value && previewFailed && (
        <p className="text-[10px] text-red-400">Bild konnte nicht geladen werden — URL prüfen.</p>
      )}
    </div>
  );
}

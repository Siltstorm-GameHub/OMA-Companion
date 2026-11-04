"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2, Images, Check } from "@/components/icons";
import type { EventCoverPreset } from "@/lib/event-cover-presets";

interface ImageUploadFieldProps {
  /** Aktuelle Bild-URL (oder leer). */
  value: string;
  onChange: (url: string) => void;
  /** Muss einem `kind` aus /api/upload entsprechen — die Route prüft dagegen. */
  kind: "event-cover" | "community-job-asset";
  label?: string;
  hint?: string;
  /** Seitenverhältnis der Vorschau, z.B. "16/9" oder "4/1". */
  previewAspect?: string;
  /** Vorlagen zur Auswahl (z.B. EVENT_COVER_PRESETS) — Klick übernimmt deren Pfad als Wert. */
  presets?: EventCoverPreset[];
  /** Nur Vorlagen wählbar (kein Upload, keine eigene URL) — für Community-Ersteller ohne Mod-Rolle. */
  presetsOnly?: boolean;
}

/**
 * Bild hochladen oder URL einfügen.
 *
 * Beide Wege bleiben bewusst offen: Uploads brauchen einen konfigurierten
 * Blob-Store, und ohne den (BLOB_READ_WRITE_TOKEN fehlt → 503) wäre das Feld
 * sonst tot.
 */
export default function ImageUploadField({
  value,
  onChange,
  kind,
  label = "Bild",
  hint,
  previewAspect = "16/9",
  presets,
  presetsOnly = false,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const activePreset = presets?.find((p) => p.url === value);
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
        {presetsOnly ? (
          <span className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-gray-400 truncate">
            {activePreset ? activePreset.label : value ? "Eigenes Bild" : "Kein Bild — Spiel-Cover bzw. Standard-Motiv"}
          </span>
        ) : (<>
        <input
          type="text"
          inputMode="url"
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
        </>)}

        {presets && presets.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPresets((v) => !v)}
            title="Vorlage auswählen"
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
              showPresets
                ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                : "border-white/[0.1] bg-white/[0.03] text-gray-300 hover:border-teal-500/40"
            }`}
          >
            <Images className="w-3.5 h-3.5" /> Vorlagen
          </button>
        )}

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

      {presets && showPresets && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 rounded-xl border border-white/[0.08] bg-black/20">
          {presets.map((p) => {
            const active = p.url === value;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPreviewFailed(false); onChange(p.url); setShowPresets(false); }}
                className={`group relative rounded-lg overflow-hidden border text-left transition-colors ${
                  active ? "border-teal-400 ring-1 ring-teal-400/60" : "border-white/[0.08] hover:border-teal-500/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- statisches SVG aus public/ */}
                <img src={p.url} alt="" loading="lazy" className="w-full aspect-[1200/630] object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 px-2 py-1 text-[10px] font-semibold text-white bg-gradient-to-t from-black/85 to-transparent">
                  {p.label}
                </span>
                {active && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-black">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

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

      {activePreset && (
        <p className="text-[10px] text-teal-400/80">Vorlage: {activePreset.label}</p>
      )}

      {value && previewFailed && (
        <p className="text-[10px] text-red-400">Bild konnte nicht geladen werden — URL prüfen.</p>
      )}
    </div>
  );
}

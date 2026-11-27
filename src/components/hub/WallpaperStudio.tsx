"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Download, ImagePlus, RotateCcw, User, Wand2 } from "@/components/icons";
import {
  WALLPAPER_ACCENTS,
  WALLPAPER_FORMATS,
  WALLPAPER_TEMPLATES,
  renderWallpaper,
  type WallpaperFormatKey,
  type WallpaperOptions,
  type WallpaperTemplate,
} from "@/lib/wallpaper-render";

const PREVIEW_MAX = 1280;
const LOGO_SRC = "/brand/logo-512.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = src;
  });
}

/** Schriftfamilie der App (Space Grotesk über next/font) für das Canvas ermitteln und laden. */
async function resolveFont(): Promise<string> {
  const css = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim()
    || getComputedStyle(document.body).getPropertyValue("--font-display").trim();
  const family = css || "'Space Grotesk', system-ui, sans-serif";
  try { await document.fonts.load(`700 48px ${family}`); } catch { /* Fallback-Schrift reicht */ }
  return family;
}

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wallpaper";

export default function WallpaperStudio({ userName, avatarSrc }: { userName: string; avatarSrc: string | null }) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [source, setSource] = useState<"avatar" | "upload">(avatarSrc ? "avatar" : "upload");
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fontFamily, setFontFamily] = useState<string | null>(null);

  const [template, setTemplate] = useState<WallpaperTemplate>("emblem");
  const [formatKey, setFormatKey] = useState<WallpaperFormatKey>("fhd");
  const [accent, setAccent] = useState<string>(WALLPAPER_ACCENTS[0].hex);
  const [title, setTitle] = useState(userName);
  const [subtitle, setSubtitle] = useState("Old Masters Allies");
  const [showLogo, setShowLogo] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [exporting, setExporting] = useState(false);

  const format = WALLPAPER_FORMATS.find((f) => f.key === formatKey)!;

  // Logo + Schrift einmalig laden
  useEffect(() => {
    loadImage(LOGO_SRC).then(setLogo).catch(() => setLogo(null));
    resolveFont().then(setFontFamily);
  }, []);

  // Profilbild laden (über den Next-Bildoptimierer, damit es same-origin ist und das Canvas nicht "tainted" wird)
  useEffect(() => {
    if (source !== "avatar" || !avatarSrc) return;
    let alive = true;
    loadImage(avatarSrc)
      .then((img) => { if (alive) setPhoto(img); })
      .catch(() => { if (alive) { setPhoto(null); toast.error("Profilbild konnte nicht geladen werden — lade stattdessen ein eigenes Bild hoch."); } });
    return () => { alive = false; };
  }, [source, avatarSrc]);

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  async function pickFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Bitte eine Bilddatei wählen"); return; }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    try {
      const img = await loadImage(url);
      setPhoto(img);
      setSource("upload");
      resetCrop();
    } catch {
      toast.error("Das Bild konnte nicht gelesen werden");
    }
  }

  function resetCrop() { setZoom(1); setOffsetX(0); setOffsetY(0); }

  const options = useMemo<Omit<WallpaperOptions, "width" | "height"> | null>(() => fontFamily ? ({
    template, accent, title, subtitle, showLogo, zoom, offsetX, offsetY, fontFamily,
  }) : null, [template, accent, title, subtitle, showLogo, zoom, offsetX, offsetY, fontFamily]);

  const activePhoto = source === "avatar" && !avatarSrc ? null : photo;

  // Vorschau (verkleinert, gleiche Komposition — der Renderer skaliert alles relativ zur kürzeren Seite)
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !options) return;
    const scale = Math.min(1, PREVIEW_MAX / Math.max(format.w, format.h));
    const w = Math.round(format.w * scale), h = Math.round(format.h * scale);
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const raf = requestAnimationFrame(() => renderWallpaper(ctx, { ...options, width: w, height: h }, { photo: activePhoto, logo }));
    return () => cancelAnimationFrame(raf);
  }, [options, format, activePhoto, logo]);

  // Ausschnitt per Ziehen in der Vorschau verschieben
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activePhoto) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
  }, [activePhoto, offsetX, offsetY]);
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    // Ziehen nach rechts zeigt mehr vom linken Bildteil → Vorzeichen umkehren
    setOffsetX(clamp(d.ox - ((e.clientX - d.x) / rect.width) * 3));
    setOffsetY(clamp(d.oy - ((e.clientY - d.y) / rect.height) * 3));
  }, []);
  const onPointerUp = useCallback(() => { drag.current = null; }, []);

  async function exportPng() {
    if (!options) return;
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = format.w; canvas.height = format.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas nicht verfügbar");
      renderWallpaper(ctx, { ...options, width: format.w, height: format.h }, { photo: activePhoto, logo });
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("Bild konnte nicht erzeugt werden");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oma-wallpaper-${slug(title)}-${format.w}x${format.h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Wallpaper gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  }

  const pill = (on: boolean) =>
    `min-h-10 rounded-control border px-3 text-sm font-semibold transition-colors ${
      on ? "border-primary bg-primary-soft text-primary-fg" : "border-line text-muted hover:border-line-strong hover:text-fg"
    }`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Vorschau */}
      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <div
          className="flex items-center justify-center overflow-hidden rounded-card border border-line bg-surface-2 p-3"
          style={{ minHeight: 240 }}
        >
          <canvas
            ref={previewRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`block max-w-full rounded-control shadow-card ${activePhoto ? "cursor-grab active:cursor-grabbing" : ""}`}
            style={{ maxHeight: "70vh", width: format.h > format.w ? "auto" : "100%", height: format.h > format.w ? "70vh" : "auto", touchAction: "none" }}
            aria-label="Vorschau deines Wallpapers"
            role="img"
          />
        </div>
        <p className="text-center text-xs text-subtle">
          {activePhoto ? "Tipp: In der Vorschau ziehen, um den Bildausschnitt zu verschieben. " : ""}
          Dein Bild bleibt auf deinem Gerät — es wird nicht hochgeladen.
        </p>
      </div>

      {/* Einstellungen */}
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="font-bold text-fg">1 · Bild</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!avatarSrc} onClick={() => { setSource("avatar"); resetCrop(); }}
              className={`${pill(source === "avatar")} flex items-center justify-center gap-2 disabled:opacity-40`}>
              <User className="size-4" /> Profilbild
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}
              className={`${pill(source === "upload")} flex items-center justify-center gap-2`}>
              <ImagePlus className="size-4" /> Eigenes Bild
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />

          <label className="block space-y-1">
            <span className="flex justify-between text-xs text-muted"><span>Zoom</span><span>{zoom.toFixed(1)}×</span></span>
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted">Horizontal</span>
              <input type="range" min={-1} max={1} step={0.02} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Vertikal</span>
              <input type="range" min={-1} max={1} step={0.02} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
            </label>
          </div>
          <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={resetCrop}>Ausschnitt zurücksetzen</Button>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold text-fg">2 · Vorlage</h2>
          <div className="grid grid-cols-2 gap-2">
            {WALLPAPER_TEMPLATES.map((t) => (
              <button key={t.key} type="button" onClick={() => setTemplate(t.key)} aria-pressed={template === t.key}
                className={`${pill(template === t.key)} flex flex-col items-start py-2 text-left`}>
                <span>{t.label}</span>
                <span className="text-xs font-normal text-subtle">{t.hint}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-fg">Akzentfarbe</span>
            <div className="flex flex-wrap gap-2">
              {WALLPAPER_ACCENTS.map((a) => (
                <button key={a.key} type="button" onClick={() => setAccent(a.hex)} aria-label={a.label} title={a.label} aria-pressed={accent === a.hex}
                  className={`size-9 rounded-full border-2 transition-transform hover:scale-110 ${accent === a.hex ? "border-fg" : "border-transparent"}`}
                  style={{ background: a.hex }} />
              ))}
              <label className="relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-line text-xs text-muted" title="Eigene Farbe">
                <span aria-hidden>+</span>
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Eigene Farbe" />
              </label>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold text-fg">3 · Text</h2>
          <Input label="Schriftzug" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          <Input label="Unterzeile" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={50} />
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
            OMA-Logo anzeigen
          </label>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold text-fg">4 · Format</h2>
          {(["Desktop", "Handy"] as const).map((group) => (
            <div key={group} className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-subtle">{group}</span>
              <div className="grid grid-cols-2 gap-2">
                {WALLPAPER_FORMATS.filter((f) => f.group === group).map((f) => (
                  <button key={f.key} type="button" onClick={() => setFormatKey(f.key)} aria-pressed={formatKey === f.key}
                    className={`${pill(formatKey === f.key)} flex flex-col items-start py-1.5 text-left`}>
                    <span>{f.label}</span>
                    <span className="text-xs font-normal text-subtle">{f.w} × {f.h}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <Button size="lg" className="w-full" loading={exporting} disabled={!options} icon={<Download className="size-5" />} onClick={exportPng}>
          Wallpaper herunterladen
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-subtle">
          <Wand2 className="size-3.5" /> PNG in {format.w} × {format.h}
        </p>
      </div>
    </div>
  );
}

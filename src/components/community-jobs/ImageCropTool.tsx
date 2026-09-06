"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Crop } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Freier Zuschnitt + übliche Social-Media-Formate als Vorschläge, komplett
 * clientseitig auf Canvas — kein neues npm-Paket, gleicher Ansatz wie
 * studio-templates.ts. Rect-Koordinaten laufen in Anzeige-Pixeln (relativ zur
 * gerenderten Bildgröße), Export rechnet auf die Naturgröße des Bilds hoch.
 */

interface Rect { x: number; y: number; w: number; h: number }
type Handle = "move" | "nw" | "ne" | "sw" | "se";

const PRESETS: { label: string; ratio: number | null }[] = [
  { label: "Frei", ratio: null },
  { label: "1:1 Quadrat", ratio: 1 },
  { label: "4:5 Hochformat", ratio: 4 / 5 },
  { label: "9:16 Story", ratio: 9 / 16 },
  { label: "16:9 Breitbild", ratio: 16 / 9 },
  { label: "1.91:1 Link-Vorschau", ratio: 1.91 },
];

const DISPLAY_MAX_W = 520;
const MIN_SIZE = 30;

function centeredRect(displayW: number, displayH: number, ratio: number | null): Rect {
  if (ratio == null) return { x: displayW * 0.1, y: displayH * 0.1, w: displayW * 0.8, h: displayH * 0.8 };
  let w = displayW * 0.85, h = w / ratio;
  if (h > displayH * 0.85) { h = displayH * 0.85; w = h * ratio; }
  return { x: (displayW - w) / 2, y: (displayH - h) / 2, w, h };
}

function clampRect(r: Rect, maxW: number, maxH: number): Rect {
  const w = Math.min(r.w, maxW), h = Math.min(r.h, maxH);
  const x = Math.min(Math.max(r.x, 0), maxW - w);
  const y = Math.min(Math.max(r.y, 0), maxH - h);
  return { x, y, w, h };
}

export default function ImageCropTool({
  imageUrl, onCropped, onCancel,
}: { imageUrl: string; onCropped: (url: string) => void; onCancel: () => void }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [ratio, setRatio] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; startRect: Rect } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, DISPLAY_MAX_W / img.naturalWidth);
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      setImage(img);
      setDisplay({ w, h });
      setRect(centeredRect(w, h, null));
    };
    img.onerror = () => toast.error("Bild konnte nicht geladen werden");
    img.src = imageUrl;
  }, [imageUrl]);

  function applyPreset(r: number | null) {
    setRatio(r);
    setRect(centeredRect(display.w, display.h, r));
  }

  function onHandleDown(handle: Handle, e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, startRect: rect };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    const s = drag.startRect;

    if (drag.handle === "move") {
      setRect(clampRect({ ...s, x: s.x + dx, y: s.y + dy }, display.w, display.h));
      return;
    }

    let next: Rect = { ...s };
    if (drag.handle === "se") { next.w = Math.max(MIN_SIZE, s.w + dx); next.h = ratio ? next.w / ratio : Math.max(MIN_SIZE, s.h + dy); }
    if (drag.handle === "sw") { next.w = Math.max(MIN_SIZE, s.w - dx); next.x = s.x + s.w - next.w; next.h = ratio ? next.w / ratio : Math.max(MIN_SIZE, s.h + dy); }
    if (drag.handle === "ne") { next.w = Math.max(MIN_SIZE, s.w + dx); next.h = ratio ? next.w / ratio : Math.max(MIN_SIZE, s.h - dy); next.y = ratio ? s.y + s.h - next.h : s.y + dy; if (!ratio) next.y = s.y + dy; }
    if (drag.handle === "nw") { next.w = Math.max(MIN_SIZE, s.w - dx); next.x = s.x + s.w - next.w; next.h = ratio ? next.w / ratio : Math.max(MIN_SIZE, s.h - dy); next.y = ratio ? s.y + s.h - next.h : s.y + dy; }

    setRect(clampRect(next, display.w, display.h));
  }

  function onMouseUp() {
    dragRef.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  useEffect(() => () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Cleanup nur beim Unmount, Listener werden gezielt in onHandleDown/onMouseUp verwaltet
  }, []);

  async function exportCrop() {
    if (!image || !display.w) return;
    setExporting(true);
    try {
      const scale = image.naturalWidth / display.w;
      const sx = rect.x * scale, sy = rect.y * scale, sw = rect.w * scale, sh = rect.h * scale;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas nicht verfügbar");
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Export fehlgeschlagen");

      const body = new FormData();
      body.append("file", blob, "cropped.png");
      body.append("kind", "community-job-asset");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload fehlgeschlagen");

      onCropped(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Zuschnitt fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <Button key={p.label} size="sm" variant={ratio === p.ratio ? "primary" : "outline"} onClick={() => applyPreset(p.ratio)}>
            {p.label}
          </Button>
        ))}
      </div>

      {display.w > 0 && (
        <div ref={boxRef} className="relative select-none mx-auto" style={{ width: display.w, height: display.h }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau, beliebiger Blob-Host */}
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" />
          <div
            onMouseDown={e => onHandleDown("move", e)}
            className="absolute border-2 border-teal-400 bg-teal-400/10 cursor-move overflow-hidden"
            style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- zeigt den Ausschnitt scharf, Rest bleibt abgedunkelt */}
            <img src={imageUrl} alt="" draggable={false}
              style={{
                position: "absolute", left: -rect.x, top: -rect.y, width: display.w, height: display.h, maxWidth: "none",
              }} />
          </div>
          {(["nw", "ne", "sw", "se"] as Handle[]).map(h => (
            <div key={h} onMouseDown={e => onHandleDown(h, e)}
              className="absolute w-3 h-3 bg-teal-400 rounded-full border border-white/60 cursor-nwse-resize"
              style={{
                left: rect.x + (h.includes("w") ? 0 : rect.w) - 6,
                top: rect.y + (h.includes("n") ? 0 : rect.h) - 6,
              }} />
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
        <Button loading={exporting} icon={<Crop className="w-3.5 h-3.5" />} onClick={exportCrop}>Zuschneiden übernehmen</Button>
      </div>
    </div>
  );
}

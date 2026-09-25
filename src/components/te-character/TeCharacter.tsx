"use client";

// ============================================
// Time-Elements-Figur — Canvas-Renderer (Ebenen-Stapel, animiert)
// ============================================

import { useEffect, useRef } from "react";
import { TE_ANIMS, TE_DIR_ROW, TE_FRAME, resolveTeLayers, type TeAnim, type TeCharacterConfig, type TeDir } from "@/lib/te-character";

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/** Lädt ein Sheet einmalig; fehlende Dateien liefern null statt die ganze Figur zu verlieren. */
export function loadTeImage(src: string): Promise<HTMLImageElement | null> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

export async function loadTeLayers(config: TeCharacterConfig): Promise<HTMLImageElement[]> {
  const imgs = await Promise.all(resolveTeLayers(config).map((l) => loadTeImage(l.src)));
  return imgs.filter((i): i is HTMLImageElement => i !== null);
}

export interface Crop { x: number; y: number; w: number; h: number }
const FULL: Crop = { x: 0, y: 0, w: TE_FRAME, h: TE_FRAME };

/** Zeichnet ein Bild der Figur; dx/dy in Zielpixeln (linke obere Ecke des Ausschnitts), scale = Zielpixel je Bildpixel. */
export function drawTeFrame(
  ctx: CanvasRenderingContext2D, images: HTMLImageElement[], frame: number, dir: TeDir, dx: number, dy: number, scale: number, crop: Crop = FULL,
) {
  for (const img of images) {
    ctx.drawImage(img, frame * TE_FRAME + crop.x, TE_DIR_ROW[dir] * TE_FRAME + crop.y, crop.w, crop.h, dx, dy, crop.w * scale, crop.h * scale);
  }
}

interface Props {
  config: TeCharacterConfig;
  anim?: TeAnim;
  dir?: TeDir;
  scale?: number;
  /** Bildausschnitt (Figur eng statt ganzer 48×48-Frame). */
  crop?: Crop;
  /** Überschreibt, ob die Animation in Schleife läuft (Standard: laut TE_ANIMS). */
  loop?: boolean;
  /** Nach dem letzten Bild einer Einmal-Animation. */
  onDone?: () => void;
  /** Ändert sich der Wert, startet die Animation neu (auch bei gleicher `anim`). */
  replayKey?: number;
  className?: string;
  title?: string;
}

export default function TeCharacter({
  config, anim = "idle", dir = "down", scale = 4, crop = FULL, loop, onDone, replayKey = 0, className = "", title,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });
  const configKey = JSON.stringify(config);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const def = TE_ANIMS[anim];
    const loops = loop ?? def.loop;

    loadTeLayers(config).then((images) => {
      if (cancelled) return;
      ctx.imageSmoothingEnabled = false;
      const draw = (i: number) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawTeFrame(ctx, images, def.frames[i], dir, 0, 0, scale, crop);
      };
      let i = 0;
      draw(0);
      if (def.frames.length > 1) {
        timer = setInterval(() => {
          if (!loops && i >= def.frames.length - 1) {
            if (timer) clearInterval(timer);
            onDoneRef.current?.();
            return;
          }
          i = (i + 1) % def.frames.length;
          draw(i);
        }, 1000 / def.fps);
      } else if (!loops) {
        timer = setTimeout(() => onDoneRef.current?.(), 1000 / def.fps) as unknown as ReturnType<typeof setInterval>;
      }
    });
    return () => { cancelled = true; if (timer) { clearInterval(timer); clearTimeout(timer as unknown as number); } };
    // config und crop werden über ihre Werte verfolgt (stabiler Vergleich statt Objekt-Identität)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, anim, dir, scale, replayKey, loop, crop.x, crop.y, crop.w, crop.h]);

  return (
    <canvas
      ref={ref}
      width={crop.w * scale}
      height={crop.h * scale}
      className={className}
      style={{ imageRendering: "pixelated" }}
      role="img"
      aria-label={title ?? "Figur"}
    />
  );
}

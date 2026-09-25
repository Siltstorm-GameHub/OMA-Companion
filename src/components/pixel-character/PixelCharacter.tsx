"use client";

// ============================================
// Pixel-Charakter — Canvas-Renderer (Ebenen-Stapel, animiert)
// ============================================
// mode "full"     = ganzer 64er-Frame (Spielfigur auf der Karte, animiert idle/move)
// mode "focus"    = enger Ausschnitt um die Figur (Karte, Editor-Vorschau, animiert)

import { useEffect, useRef } from "react";
import {
  DIR_ROW, FRAME, CATALOG, FOCUS_RECT, PIXEL_ANIM_FPS, resolveLayers,
  type PixelAnim, type PixelCharacterConfig, type PixelDir,
} from "@/lib/pixel-character";

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadPixelImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { imageCache.delete(src); reject(new Error(`Sheet fehlt: ${src}`)); };
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

interface Rect { x: number; y: number; w: number; h: number }

function drawFrame(
  ctx: CanvasRenderingContext2D,
  images: HTMLImageElement[],
  frame: number,
  dir: PixelDir,
  rect: Rect,
  scale: number,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = false;
  for (const img of images) {
    ctx.drawImage(
      img,
      frame * FRAME + rect.x, DIR_ROW[dir] * FRAME + rect.y, rect.w, rect.h,
      0, 0, rect.w * scale, rect.h * scale,
    );
  }
}

async function loadLayers(config: PixelCharacterConfig, anim: PixelAnim): Promise<HTMLImageElement[]> {
  const layers = resolveLayers(config, anim);
  // Einzelne fehlende Sheets sollen die Figur nicht komplett verschwinden lassen.
  const results = await Promise.all(layers.map((l) => loadPixelImage(l.src).catch(() => null)));
  return results.filter((i): i is HTMLImageElement => i !== null);
}

interface Props {
  config: PixelCharacterConfig;
  anim?: PixelAnim;
  dir?: PixelDir;
  /** Ganzzahliger Vergrößerungsfaktor (1 Frame-Pixel = scale Bildschirm-Pixel) */
  scale?: number;
  mode?: "full" | "focus";
  className?: string;
  title?: string;
}

export default function PixelCharacter({
  config, anim = "idle", dir = "down", scale = 4, mode = "full", className = "", title,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rect: Rect = mode === "focus" ? FOCUS_RECT : { x: 0, y: 0, w: FRAME, h: FRAME };
  const configKey = JSON.stringify(config.layers);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const frames = CATALOG.frames[anim];

    loadLayers(config, anim).then((images) => {
      if (cancelled) return;
      let frame = 0;
      drawFrame(ctx, images, 0, dir, rect, scale);
      if (frames > 1) {
        timer = setInterval(() => {
          frame = (frame + 1) % frames;
          drawFrame(ctx, images, frame, dir, rect, scale);
        }, 1000 / PIXEL_ANIM_FPS[anim]);
      }
    });
    return () => { cancelled = true; if (timer) clearInterval(timer); };
    // config wird über configKey verfolgt (stabiler Vergleich statt Objekt-Identität)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, anim, dir, scale, mode]);

  return (
    <canvas
      ref={ref}
      width={rect.w * scale}
      height={rect.h * scale}
      className={className}
      style={{ imageRendering: "pixelated" }}
      role="img"
      aria-label={title ?? "Pixel-Charakter"}
    />
  );
}

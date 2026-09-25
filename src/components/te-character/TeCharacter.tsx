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

/** Zeichnet ein Bild der Figur; dx/dy in Zielpixeln (linke obere Ecke des 48×48-Frames), scale = Zielpixel je Bildpixel. */
export function drawTeFrame(
  ctx: CanvasRenderingContext2D, images: HTMLImageElement[], frame: number, dir: TeDir, dx: number, dy: number, scale: number,
) {
  for (const img of images) {
    ctx.drawImage(img, frame * TE_FRAME, TE_DIR_ROW[dir] * TE_FRAME, TE_FRAME, TE_FRAME, dx, dy, TE_FRAME * scale, TE_FRAME * scale);
  }
}

interface Props {
  config: TeCharacterConfig;
  anim?: TeAnim;
  dir?: TeDir;
  scale?: number;
  /** Ändert sich der Wert, startet die Animation neu. */
  replayKey?: number;
  className?: string;
  title?: string;
}

export default function TeCharacter({ config, anim = "idle", dir = "down", scale = 4, replayKey = 0, className = "", title }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const def = TE_ANIMS[anim];

    loadTeLayers(config).then((images) => {
      if (cancelled) return;
      ctx.imageSmoothingEnabled = false;
      const draw = (i: number) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawTeFrame(ctx, images, def.frames[i], dir, 0, 0, scale);
      };
      let i = 0;
      draw(0);
      if (def.frames.length > 1) {
        timer = setInterval(() => {
          if (!def.loop && i >= def.frames.length - 1) { if (timer) clearInterval(timer); return; }
          i = (i + 1) % def.frames.length;
          draw(i);
        }, 1000 / def.fps);
      }
    });
    return () => { cancelled = true; if (timer) clearInterval(timer); };
    // config wird über configKey verfolgt (stabiler Vergleich statt Objekt-Identität)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, anim, dir, scale, replayKey]);

  return (
    <canvas
      ref={ref}
      width={TE_FRAME * scale}
      height={TE_FRAME * scale}
      className={className}
      style={{ imageRendering: "pixelated" }}
      role="img"
      aria-label={title ?? "Figur"}
    />
  );
}

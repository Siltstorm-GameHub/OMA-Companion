"use client";

// Übersichtskarte: die ganze Karte klein, mit dem sichtbaren Ausschnitt; Klick/Ziehen springt dorthin.

import { useEffect, useRef, useState } from "react";
import { T } from "@/components/te-map/TeWorld";
import type { CustomWorldDoc } from "@/lib/te-map/custom-world";

const MAX_W = 220;
const MAX_H = 150;

export default function Minimap({ doc, baked, scrollRef, zoom }: { doc: CustomWorldDoc; baked: HTMLCanvasElement | null; scrollRef: React.RefObject<HTMLDivElement | null>; zoom: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const scale = Math.min(MAX_W / doc.cols, MAX_H / doc.rows);
  const w = Math.round(doc.cols * scale);
  const h = Math.round(doc.rows * scale);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    if (baked) ctx.drawImage(baked, 0, 0, w, h);
    for (const s of doc.stamps) { ctx.fillStyle = "rgba(20,40,20,0.7)"; ctx.fillRect(s.x * scale, s.y * scale, Math.max(1.5, scale), Math.max(1.5, scale)); }
    for (const a of doc.actors) { ctx.fillStyle = a.kind === "monster" ? "#f87171" : a.kind === "chest" ? "#fbbf24" : "#60a5fa"; ctx.fillRect(a.x * scale - 1, a.y * scale - 1, 3, 3); }
    ctx.fillStyle = "#34d399";
    ctx.fillRect(doc.spawn.x * scale - 1.5, doc.spawn.y * scale - 1.5, 4, 4);
  }, [baked, doc, scale, w, h]);

  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const update = () => {
      const tw = doc.cols * T * zoom;
      const th = doc.rows * T * zoom;
      setView({ x: sc.scrollLeft / tw, y: sc.scrollTop / th, w: Math.min(1, sc.clientWidth / tw), h: Math.min(1, sc.clientHeight / th) });
    };
    update();
    sc.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(sc);
    return () => { sc.removeEventListener("scroll", update); ro.disconnect(); };
  }, [scrollRef, doc.cols, doc.rows, zoom]);

  const jump = (e: React.PointerEvent<HTMLDivElement>) => {
    const sc = scrollRef.current;
    if (!sc) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    sc.scrollLeft = fx * doc.cols * T * zoom - sc.clientWidth / 2;
    sc.scrollTop = fy * doc.rows * T * zoom - sc.clientHeight / 2;
  };

  return (
    <div
      className="relative rounded-lg border border-white/10 bg-[#0b1524] cursor-pointer touch-none"
      style={{ width: w, height: h }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); jump(e); }}
      onPointerMove={(e) => { if (e.buttons & 1) jump(e); }}
      role="img"
      aria-label="Übersichtskarte"
    >
      <canvas ref={ref} width={w} height={h} style={{ imageRendering: "pixelated", width: w, height: h, display: "block" }} />
      <div className="absolute border border-amber-300 bg-amber-300/10 pointer-events-none" style={{ left: view.x * w, top: view.y * h, width: view.w * w, height: view.h * h }} />
    </div>
  );
}

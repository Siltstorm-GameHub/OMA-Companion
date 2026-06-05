"use client";
import { useEffect, useRef } from "react";

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only on non-touch devices
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let raf: number;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let cx = mx;
    let cy = my;

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMove, { passive: true });

    function tick() {
      cx += (mx - cx) * 0.07;
      cy += (my - cy) * 0.07;
      el!.style.transform = `translate(${cx - 300}px, ${cy - 300}px)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-animated-bg
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(20,184,166,0.07) 0%, rgba(20,184,166,0.025) 45%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 1,
        willChange: "transform",
      }}
    />
  );
}

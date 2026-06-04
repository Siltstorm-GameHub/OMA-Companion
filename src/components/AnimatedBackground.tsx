"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  pulseSpeed: number;
  pulseOffset: number;
  color: string;
}

const COLORS = [
  "244,63,94",   // rose
  "244,63,94",   // rose (weighted heavier)
  "139,92,246",  // violet
  "167,139,250", // violet-light
  "255,255,255", // white
];

function createParticle(w: number, h: number): Particle {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return {
    x:           Math.random() * w,
    y:           Math.random() * h,
    vx:          (Math.random() - 0.5) * 0.3,
    vy:          (Math.random() - 0.5) * 0.3,
    radius:      Math.random() * 1.5 + 0.5,
    opacity:     Math.random() * 0.4 + 0.15,
    pulseSpeed:  Math.random() * 0.008 + 0.004,
    pulseOffset: Math.random() * Math.PI * 2,
    color,
  };
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let t = 0;

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      // Re-seed particles on resize to fill new dimensions
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 14000), 90);
      particles = Array.from({ length: count }, () =>
        createParticle(canvas.width, canvas.height)
      );
    }

    function draw() {
      if (!canvas || !ctx) return;
      t += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const CONNECTION_DIST = 130;

      // Update + draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = canvas.width  + 10;
        if (p.x > canvas.width  + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // Pulse opacity
        const pulse = Math.sin(t * p.pulseSpeed + p.pulseOffset) * 0.15;
        const alpha = Math.max(0.05, Math.min(0.6, p.opacity + pulse));

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${alpha})`;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const lineAlpha = (1 - dist / CONNECTION_DIST) * 0.12;
            // Blend colors of the two particles
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${p.color},${lineAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: 0, opacity: 0.65 }}
      data-animated-bg
    />
  );
}

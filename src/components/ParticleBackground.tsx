"use client";

// Statisch definierte Partikel — kein Math.random() → kein Hydration-Mismatch
// x/y in %, size in px, opacity 0–1, teal = leuchtendes Teal-Partikel
const PARTICLES: {
  x: number; y: number; size: number; opacity: number; teal?: boolean; delay?: number;
}[] = [
  // Reguläre Punkte
  { x:  3.2, y:  8.1, size: 1.5, opacity: 0.18 },
  { x:  7.8, y: 23.4, size: 1,   opacity: 0.12 },
  { x: 11.1, y: 67.2, size: 2,   opacity: 0.15 },
  { x: 14.5, y: 41.8, size: 1,   opacity: 0.10 },
  { x: 18.3, y: 12.6, size: 1.5, opacity: 0.20 },
  { x: 21.7, y: 88.3, size: 1,   opacity: 0.13 },
  { x: 25.0, y: 55.9, size: 2,   opacity: 0.16 },
  { x: 28.4, y: 33.1, size: 1,   opacity: 0.11 },
  { x: 31.9, y: 74.5, size: 1.5, opacity: 0.19 },
  { x: 35.2, y: 19.7, size: 1,   opacity: 0.14 },
  { x: 38.6, y: 92.1, size: 2,   opacity: 0.12 },
  { x: 42.1, y: 47.3, size: 1,   opacity: 0.17 },
  { x: 45.8, y: 6.4,  size: 1.5, opacity: 0.22 },
  { x: 49.3, y: 63.8, size: 1,   opacity: 0.13 },
  { x: 52.7, y: 29.5, size: 2,   opacity: 0.15 },
  { x: 56.1, y: 81.2, size: 1,   opacity: 0.11 },
  { x: 59.4, y: 15.3, size: 1.5, opacity: 0.18 },
  { x: 63.0, y: 52.7, size: 1,   opacity: 0.14 },
  { x: 66.5, y: 38.9, size: 2,   opacity: 0.20 },
  { x: 70.2, y: 95.4, size: 1,   opacity: 0.10 },
  { x: 73.8, y: 71.6, size: 1.5, opacity: 0.16 },
  { x: 77.1, y: 24.2, size: 1,   opacity: 0.13 },
  { x: 80.6, y: 58.4, size: 2,   opacity: 0.17 },
  { x: 84.2, y: 44.1, size: 1,   opacity: 0.12 },
  { x: 87.5, y: 10.8, size: 1.5, opacity: 0.21 },
  { x: 91.0, y: 83.5, size: 1,   opacity: 0.14 },
  { x: 94.4, y: 37.6, size: 2,   opacity: 0.15 },
  { x: 97.8, y: 61.2, size: 1,   opacity: 0.11 },
  { x:  5.7, y: 49.3, size: 1,   opacity: 0.13 },
  { x: 16.2, y: 76.8, size: 1.5, opacity: 0.16 },
  { x: 33.7, y: 4.5,  size: 1,   opacity: 0.18 },
  { x: 47.4, y: 85.7, size: 2,   opacity: 0.13 },
  { x: 61.9, y: 31.4, size: 1,   opacity: 0.15 },
  { x: 75.3, y: 7.9,  size: 1.5, opacity: 0.19 },
  { x: 88.7, y: 54.1, size: 1,   opacity: 0.12 },
  { x: 23.1, y: 98.2, size: 2,   opacity: 0.10 },
  { x: 57.6, y: 17.5, size: 1,   opacity: 0.20 },
  { x: 82.4, y: 69.3, size: 1.5, opacity: 0.14 },
  { x:  9.3, y: 35.6, size: 1,   opacity: 0.16 },
  { x: 43.8, y: 90.4, size: 2,   opacity: 0.11 },

  // Teal-Glow-Partikel (leuchten + pulsieren)
  { x: 15.4, y: 28.7, size: 3,   opacity: 0.9,  teal: true, delay: 0    },
  { x: 38.2, y: 61.3, size: 2.5, opacity: 0.85, teal: true, delay: 800  },
  { x: 62.7, y: 18.5, size: 3.5, opacity: 0.9,  teal: true, delay: 1600 },
  { x: 79.1, y: 77.4, size: 2.5, opacity: 0.85, teal: true, delay: 400  },
  { x: 24.8, y: 91.6, size: 2,   opacity: 0.80, teal: true, delay: 1200 },
  { x: 52.3, y: 42.8, size: 3,   opacity: 0.9,  teal: true, delay: 2000 },
  { x: 88.6, y: 33.1, size: 2.5, opacity: 0.85, teal: true, delay: 600  },
];

export default function ParticleBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {/* Dunkle Basis */}
      <div className="absolute inset-0" style={{ background: "var(--bg-base, #06100e)" }} />

      {/* Subtiler Teal-Blob (Tiefe) */}
      <div
        className="absolute rounded-full"
        style={{
          width: 700, height: 500,
          top: "20%", left: "25%",
          background: "radial-gradient(ellipse, rgba(20,184,166,0.07) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      {/* Zweiter, dunklerer Blob */}
      <div
        className="absolute rounded-full"
        style={{
          width: 500, height: 400,
          top: "55%", right: "10%",
          background: "radial-gradient(ellipse, rgba(13,148,136,0.05) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* Partikel */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className={p.teal ? "particle-glow" : undefined}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top:  `${p.y}%`,
            width:  p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.teal
              ? "#2dd4bf"
              : "rgba(255,255,255,0.9)",
            opacity: p.opacity,
            boxShadow: p.teal
              ? `0 0 ${p.size * 3}px ${p.size}px rgba(20,184,166,0.6), 0 0 ${p.size * 6}px rgba(20,184,166,0.3)`
              : undefined,
            animationDelay: p.teal ? `${p.delay ?? 0}ms` : undefined,
          }}
        />
      ))}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,6,5,0.85) 100%)",
        }}
      />

      {/* Dezente obere Trennlinie */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(20,184,166,0.15), transparent)" }}
      />
    </div>
  );
}

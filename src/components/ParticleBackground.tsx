"use client";

// Statisch definierte Partikel — kein Math.random() → kein Hydration-Mismatch
// x/y in %, size in px, opacity 0–1, teal = leuchtendes Teal-Partikel
// delay in ms für versetztes Twinkle
const PARTICLES: {
  x: number; y: number; size: number; opacity: number; teal?: boolean; delay?: number;
}[] = [
  // ── Reguläre Sterne (twinkeln sanft) ──────────────────────────────
  { x:  1.8, y:  5.3, size: 1.5, opacity: 0.25, delay:    0 },
  { x:  3.2, y: 18.1, size: 1,   opacity: 0.18, delay:  420 },
  { x:  5.6, y: 72.4, size: 1.5, opacity: 0.22, delay:  870 },
  { x:  7.1, y: 43.8, size: 1,   opacity: 0.15, delay: 1340 },
  { x:  8.9, y: 91.2, size: 2,   opacity: 0.20, delay:  210 },
  { x: 10.3, y: 27.6, size: 1,   opacity: 0.17, delay: 1650 },
  { x: 12.7, y: 58.4, size: 1.5, opacity: 0.24, delay:  530 },
  { x: 14.1, y: 13.9, size: 1,   opacity: 0.19, delay:  990 },
  { x: 16.5, y: 82.7, size: 2,   opacity: 0.16, delay: 1800 },
  { x: 18.2, y: 36.5, size: 1,   opacity: 0.21, delay:  310 },
  { x: 19.8, y: 65.1, size: 1.5, opacity: 0.18, delay: 1120 },
  { x: 21.4, y:  7.8, size: 1,   opacity: 0.26, delay:  740 },
  { x: 23.6, y: 49.3, size: 2,   opacity: 0.17, delay: 1460 },
  { x: 25.9, y: 94.6, size: 1,   opacity: 0.14, delay:   80 },
  { x: 27.3, y: 22.1, size: 1.5, opacity: 0.23, delay: 1960 },
  { x: 29.7, y: 77.8, size: 1,   opacity: 0.16, delay:  620 },
  { x: 31.2, y: 39.4, size: 2,   opacity: 0.20, delay: 1280 },
  { x: 33.5, y: 11.7, size: 1,   opacity: 0.22, delay:  390 },
  { x: 35.8, y: 87.2, size: 1.5, opacity: 0.15, delay: 1710 },
  { x: 37.4, y: 54.6, size: 1,   opacity: 0.19, delay:  850 },
  { x: 39.1, y: 29.3, size: 2,   opacity: 0.18, delay:   0  },
  { x: 40.8, y: 68.9, size: 1,   opacity: 0.24, delay: 1550 },
  { x: 42.3, y:  2.4, size: 1.5, opacity: 0.28, delay:  470 },
  { x: 44.7, y: 45.7, size: 1,   opacity: 0.17, delay: 1090 },
  { x: 46.2, y: 79.3, size: 2,   opacity: 0.21, delay:  730 },
  { x: 48.6, y: 16.8, size: 1,   opacity: 0.20, delay: 1890 },
  { x: 50.1, y: 61.4, size: 1.5, opacity: 0.16, delay:  290 },
  { x: 51.8, y: 33.7, size: 1,   opacity: 0.23, delay: 1400 },
  { x: 53.4, y: 97.1, size: 2,   opacity: 0.13, delay:  650 },
  { x: 55.7, y: 52.8, size: 1,   opacity: 0.18, delay: 1130 },
  { x: 57.3, y:  9.5, size: 1.5, opacity: 0.25, delay:  960 },
  { x: 59.8, y: 74.6, size: 1,   opacity: 0.17, delay: 1790 },
  { x: 61.4, y: 41.2, size: 2,   opacity: 0.20, delay:  180 },
  { x: 63.9, y: 26.9, size: 1,   opacity: 0.22, delay: 1500 },
  { x: 65.5, y: 85.4, size: 1.5, opacity: 0.15, delay:  820 },
  { x: 67.2, y: 14.3, size: 1,   opacity: 0.27, delay: 1250 },
  { x: 68.8, y: 58.7, size: 2,   opacity: 0.18, delay:   60 },
  { x: 70.4, y: 37.5, size: 1,   opacity: 0.21, delay: 1680 },
  { x: 72.7, y: 92.8, size: 1.5, opacity: 0.14, delay:  560 },
  { x: 74.3, y: 21.6, size: 1,   opacity: 0.24, delay: 1020 },
  { x: 75.9, y: 66.3, size: 2,   opacity: 0.17, delay:  340 },
  { x: 77.6, y:  4.9, size: 1,   opacity: 0.28, delay: 1760 },
  { x: 79.2, y: 47.8, size: 1.5, opacity: 0.20, delay:  690 },
  { x: 80.8, y: 80.1, size: 1,   opacity: 0.16, delay: 1380 },
  { x: 82.5, y: 31.4, size: 2,   opacity: 0.19, delay:  910 },
  { x: 84.1, y: 55.9, size: 1,   opacity: 0.23, delay:  130 },
  { x: 85.7, y: 12.7, size: 1.5, opacity: 0.26, delay: 1940 },
  { x: 87.4, y: 73.6, size: 1,   opacity: 0.17, delay:  780 },
  { x: 89.0, y: 43.1, size: 2,   opacity: 0.21, delay: 1610 },
  { x: 90.7, y: 88.4, size: 1,   opacity: 0.15, delay:  450 },
  { x: 92.3, y: 19.8, size: 1.5, opacity: 0.24, delay: 1170 },
  { x: 93.9, y: 62.5, size: 1,   opacity: 0.18, delay:  720 },
  { x: 95.5, y: 35.2, size: 2,   opacity: 0.20, delay: 1430 },
  { x: 97.1, y: 51.7, size: 1,   opacity: 0.16, delay:  260 },
  { x: 98.6, y:  8.3, size: 1.5, opacity: 0.27, delay: 1850 },
  // Zweite Dichte-Schicht — noch mehr Sterne
  { x:  2.5, y: 61.0, size: 1,   opacity: 0.13, delay:  580 },
  { x:  9.7, y: 34.2, size: 1.5, opacity: 0.18, delay: 1070 },
  { x: 15.4, y: 79.5, size: 1,   opacity: 0.14, delay:  830 },
  { x: 22.8, y: 10.6, size: 2,   opacity: 0.22, delay: 1490 },
  { x: 30.3, y: 96.3, size: 1,   opacity: 0.12, delay:  160 },
  { x: 36.6, y: 48.2, size: 1.5, opacity: 0.17, delay: 1700 },
  { x: 43.0, y: 23.5, size: 1,   opacity: 0.20, delay:  620 },
  { x: 49.5, y: 83.6, size: 2,   opacity: 0.15, delay: 1330 },
  { x: 56.2, y:  6.1, size: 1,   opacity: 0.26, delay:  490 },
  { x: 62.8, y: 70.4, size: 1.5, opacity: 0.18, delay: 1110 },
  { x: 69.4, y: 28.7, size: 1,   opacity: 0.22, delay:  760 },
  { x: 76.0, y: 57.3, size: 2,   opacity: 0.16, delay: 1900 },
  { x: 82.6, y: 15.9, size: 1,   opacity: 0.24, delay:  330 },
  { x: 89.2, y: 90.7, size: 1.5, opacity: 0.13, delay: 1560 },
  { x: 95.8, y: 39.4, size: 1,   opacity: 0.19, delay:  880 },
  { x:  6.3, y: 55.8, size: 1.5, opacity: 0.21, delay: 1210 },
  { x: 18.9, y:  0.8, size: 1,   opacity: 0.29, delay:  410 },
  { x: 26.5, y: 67.4, size: 2,   opacity: 0.17, delay: 1640 },
  { x: 34.1, y: 41.9, size: 1,   opacity: 0.20, delay:  670 },
  { x: 41.7, y: 89.1, size: 1.5, opacity: 0.14, delay: 1050 },
  { x: 48.3, y: 30.6, size: 1,   opacity: 0.23, delay:  210 },
  { x: 54.9, y: 76.3, size: 2,   opacity: 0.18, delay: 1760 },
  { x: 60.5, y: 18.4, size: 1,   opacity: 0.25, delay:  940 },
  { x: 67.1, y: 93.6, size: 1.5, opacity: 0.12, delay: 1380 },
  { x: 73.7, y: 44.8, size: 1,   opacity: 0.22, delay:  550 },
  { x: 80.3, y:  3.2, size: 2,   opacity: 0.27, delay: 1820 },
  { x: 86.9, y: 63.7, size: 1,   opacity: 0.17, delay:  120 },
  { x: 93.5, y: 26.1, size: 1.5, opacity: 0.21, delay: 1470 },
  { x:  4.0, y: 46.7, size: 1,   opacity: 0.16, delay:  700 },
  { x: 11.6, y: 99.2, size: 2,   opacity: 0.11, delay: 1150 },
  { x: 20.2, y: 53.4, size: 1,   opacity: 0.20, delay:  365 },
  { x: 28.8, y: 16.2, size: 1.5, opacity: 0.24, delay: 1590 },
  { x: 38.4, y: 85.9, size: 1,   opacity: 0.15, delay:  820 },
  { x: 47.0, y: 75.7, size: 2,   opacity: 0.18, delay: 1250 },
  { x: 58.5, y: 38.8, size: 1,   opacity: 0.22, delay:  480 },
  { x: 71.3, y:  9.0, size: 1.5, opacity: 0.26, delay: 1970 },
  { x: 83.8, y: 50.6, size: 1,   opacity: 0.19, delay:  630 },
  { x: 91.4, y: 77.3, size: 2,   opacity: 0.14, delay: 1080 },
  { x: 96.7, y: 22.9, size: 1,   opacity: 0.23, delay:  280 },

  // ── Teal-Glow-Partikel (pulsieren stärker) ────────────────────────
  { x: 10.2, y: 28.7, size: 3,   opacity: 0.9,  teal: true, delay:    0 },
  { x: 26.5, y: 61.3, size: 2.5, opacity: 0.85, teal: true, delay:  700 },
  { x: 44.8, y: 12.4, size: 3.5, opacity: 0.9,  teal: true, delay: 1400 },
  { x: 61.7, y: 78.9, size: 2.5, opacity: 0.85, teal: true, delay:  350 },
  { x: 34.3, y: 91.6, size: 2,   opacity: 0.80, teal: true, delay: 1050 },
  { x: 73.9, y: 42.8, size: 3,   opacity: 0.9,  teal: true, delay: 1750 },
  { x: 88.1, y: 20.5, size: 2.5, opacity: 0.85, teal: true, delay:  525 },
  { x: 17.6, y: 56.2, size: 2,   opacity: 0.80, teal: true, delay: 1225 },
  { x: 53.4, y: 34.1, size: 3,   opacity: 0.9,  teal: true, delay:  875 },
  { x: 95.2, y: 68.4, size: 2.5, opacity: 0.85, teal: true, delay: 1575 },
];

export default function ParticleBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {/* Dunkle Basis */}
      <div className="absolute inset-0" style={{ background: "#06100e" }} />

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
          className={p.teal ? "particle-glow" : "particle-twinkle"}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top:  `${p.y}%`,
            width:  p.size,
            height: p.size,
            borderRadius: "50%",
            // Deckkraft-Variation steckt im Alpha der Hintergrundfarbe;
            // Keyframe steuert opacity 1→0.12 einheitlich → Twinkle-Effekt
            background: p.teal
              ? "#2dd4bf"
              : `rgba(255,255,255,${p.opacity})`,
            boxShadow: p.teal
              ? `0 0 ${p.size * 3}px ${p.size}px rgba(20,184,166,0.6), 0 0 ${p.size * 6}px rgba(20,184,166,0.3)`
              : undefined,
            animationDelay: `${p.delay ?? 0}ms`,
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

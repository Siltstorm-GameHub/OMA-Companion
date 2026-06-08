"use client";
import confetti from "canvas-confetti";

export function fireConfetti() {
  // Burst from center
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#fbbf24", "#f59e0b", "#34d399", "#a78bfa", "#f87171"],
    disableForReducedMotion: true,
  });
  // Second burst slightly delayed
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 50,
      angle: 60,
      origin: { x: 0, y: 0.7 },
      colors: ["#fbbf24", "#34d399"],
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 60,
      spread: 50,
      angle: 120,
      origin: { x: 1, y: 0.7 },
      colors: ["#a78bfa", "#f87171"],
      disableForReducedMotion: true,
    });
  }, 200);
}

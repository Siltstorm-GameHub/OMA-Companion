"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

// Hintergrundfarben aus globals.css
const THEME_COLORS = {
  light: "#f2f2f7",
  dark:  "#080c18",
} as const;

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  function toggle() {
    const next  = theme === "dark" ? "light" : "dark";
    const color = THEME_COLORS[next];

    // ── Kreis-Overlay erzeugen ─────────────────────────────────────
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position:       "fixed",
      inset:          "0",
      background:     color,
      clipPath:       "circle(0% at 0% 100%)",    // Startpunkt: Punkt in der unteren linken Ecke
      zIndex:         "99999",
      pointerEvents:  "none",
      willChange:     "clip-path",
      // Transition: Kreis expandiert nach oben-rechts
      transition:     "clip-path 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
    });
    document.body.appendChild(overlay);

    // Einen Frame warten → dann Animation starten
    // (zwei rAF stellen sicher, dass der Browser die Startwerte gecacht hat)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.clipPath = "circle(150% at 0% 100%)";
      });
    });

    // Theme in der Mitte der Animation wechseln
    const switchAt = 320; // ms
    setTimeout(() => {
      setTheme(next);
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }, switchAt);

    // Overlay entfernen — kurzes Fade-out damit kein harter Schnitt
    setTimeout(() => {
      overlay.style.transition = "opacity 0.25s ease";
      overlay.style.opacity    = "0";
      setTimeout(() => overlay.remove(), 260);
    }, 680);
  }

  const label = theme === "dark" ? "Light Mode" : "Dark Mode";

  return (
    <button
      onClick={toggle}
      title={label}
      className={`group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] ${
        collapsed ? "justify-center p-2.5 w-full" : "gap-2.5 px-3 py-2.5 w-full"
      }`}
    >
      {theme === "dark"
        ? <Sun  className="w-4 h-4 shrink-0 text-gray-600 group-hover:text-amber-400 transition-colors" />
        : <Moon className="w-4 h-4 shrink-0 text-gray-600 group-hover:text-blue-400  transition-colors" />}
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg bg-[#141420] border border-white/10 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
          {label}
        </span>
      )}
    </button>
  );
}

"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

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

    // ── Overlay erzeugen ─────────────────────────────────────────
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position:      "fixed",
      inset:         "0",
      background:    color,
      zIndex:        "99999",
      pointerEvents: "none",
    });
    document.body.appendChild(overlay);

    // ── Kreis-Animation via Web Animations API ───────────────────
    // Startet sofort und braucht keinen rAF-Trick
    const expand = overlay.animate(
      [
        { clipPath: "circle(0% at 0% 100%)" },
        { clipPath: "circle(150% at 0% 100%)" },
      ],
      {
        duration: 700,
        easing:   "cubic-bezier(0.4, 0, 0.2, 1)",
        fill:     "forwards",
      }
    );

    // Theme wechseln wenn der Kreis den Bildschirm vollständig bedeckt (~70%)
    setTimeout(() => {
      setTheme(next);
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }, 490);

    // Nach der Expand-Animation: kurz einblenden lassen, dann wegfaden
    expand.onfinish = () => {
      const fade = overlay.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 220, easing: "ease", fill: "forwards" }
      );
      fade.onfinish = () => overlay.remove();
    };
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

"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Reads localStorage (unavailable during SSR) after mount, matching the
    // inline anti-FOUC script in layout.tsx <head> which already set the DOM
    // attribute pre-paint. A lazy useState initializer would run during
    // hydration itself and could mismatch the server-rendered ("dark") output.
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const apply = () => {
      setTheme(next);
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
    };
    if (typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === "function") {
      (document as Document & { startViewTransition: (fn: () => void) => void }).startViewTransition(apply);
    } else {
      apply();
    }
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

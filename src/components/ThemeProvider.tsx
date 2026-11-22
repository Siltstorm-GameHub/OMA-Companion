"use client";
import { createContext, useContext, useEffect } from "react";

/**
 * Der Designentwurf (OMA 2.0, Richtung G) kennt nur das dunkle Dashboard — der Hellmodus ist
 * entfernt. Der Context bleibt bestehen, damit Lesestellen (z. B. ThemedToaster) unverändert
 * funktionieren; er liefert immer "dark".
 */
type Theme = "dark";

const ThemeContext = createContext<{ theme: Theme }>({ theme: "dark" });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Alte Auswahl aus dem Hellmodus aufräumen
    try { localStorage.removeItem("theme"); } catch { /* Speicher gesperrt */ }
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return <ThemeContext.Provider value={{ theme: "dark" }}>{children}</ThemeContext.Provider>;
}

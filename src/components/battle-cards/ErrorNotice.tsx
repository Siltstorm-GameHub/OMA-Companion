// ============================================
// Einheitliche Fehler-Anzeige — Battle Cards
// ============================================
// Ersetzt die bisher uneinheitlichen `<p className="text-rose-400">`-Zeilen
// (mal mit, mal ohne Icon, unterschiedliche Größen) durch ein gemeinsames
// Muster: Icon + Text auf rose-getöntem Grund.

import { AlertCircle } from "lucide-react";

export default function ErrorNotice({ message, size = "sm" }: { message: string; size?: "sm" | "lg" }) {
  const isLarge = size === "lg";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 ${
        isLarge ? "px-4 py-3 text-sm" : "px-2.5 py-1.5 text-xs"
      }`}
    >
      <AlertCircle className={`shrink-0 ${isLarge ? "w-4 h-4" : "w-3.5 h-3.5"}`} />
      <span>{message}</span>
    </div>
  );
}

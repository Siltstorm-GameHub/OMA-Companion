import type { ReactNode } from "react";

/**
 * "Mehr"-Menü der Aktionsleiste: seltene Aktionen (Kalender, Discord, Streamen) — damit vorne nur der
 * Hauptknopf und der eigene Stand stehen. Natives <details>, funktioniert ohne JavaScript.
 */
export default function ActionMoreMenu({ children }: { children: ReactNode }) {
  return (
    <details className="relative group">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/[0.08]">
        Mehr <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="absolute right-0 z-30 mt-1.5 min-w-[11rem] rounded-xl border border-white/[0.1] bg-[#12151c] p-1.5 shadow-xl flex flex-col gap-1 [&>*]:w-full [&>*]:justify-start">
        {children}
      </div>
    </details>
  );
}

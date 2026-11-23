import type { ReactNode } from "react";
import { ChevronDown } from "@/components/icons";

/**
 * "Mehr"-Menü der Aktionsleiste: seltene Aktionen (Kalender, Discord, Streamen) — damit vorne nur der
 * Hauptknopf und der eigene Stand stehen. Natives <details>, funktioniert ohne JavaScript.
 */
export default function ActionMoreMenu({ children }: { children: ReactNode }) {
  return (
    <details className="relative group">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none inline-flex min-h-10 items-center gap-1.5 rounded-control border border-line-strong bg-surface-2 px-3.5 text-sm font-semibold text-fg hover:bg-surface-3">
        Mehr <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-1.5 min-w-[13rem] rounded-control border border-line-strong bg-surface-2 p-1 shadow-card flex flex-col gap-0.5 [&>*]:w-full [&>*]:justify-start">
        {children}
      </div>
    </details>
  );
}

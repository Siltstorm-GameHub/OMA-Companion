import Link from "next/link";
import type { ReactNode } from "react";

/** Admin-Übersicht: eine offene Aufgabe mit Wartezeit und direktem Button (Öffnen, Abschließen, Prüfen). */
export default function AdminInboxRow({ href, title, hint, action, icon, since, late = false }: {
  href: string; title: string; hint: string; action: string; icon: ReactNode;
  /** z.B. "seit 3 Tagen" */
  since?: string | null;
  /** Wartet schon zu lange → Wartezeit rot */
  late?: boolean;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 py-2.5">
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{title}</span>
          {hint && <span className="block truncate text-[11px] text-gray-500">{hint}</span>}
        </span>
        {since && (
          <span className={`hidden sm:block shrink-0 text-[11px] tabular-nums ${late ? "font-semibold text-red-300" : "text-gray-500"}`}>{since}</span>
        )}
        <span className="shrink-0 rounded-lg border border-line-strong bg-line px-2.5 py-1 text-xs font-semibold text-gray-200 group-hover:bg-line group-hover:text-white">
          {action}
        </span>
      </Link>
    </li>
  );
}

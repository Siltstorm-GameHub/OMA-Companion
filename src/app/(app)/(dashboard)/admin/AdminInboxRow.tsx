import Link from "next/link";
import type { ReactNode } from "react";

/** Admin-Übersicht: eine offene Aufgabe mit direktem Button (Öffnen, Abschließen, Prüfen). */
export default function AdminInboxRow({ href, title, hint, action, icon }: { href: string; title: string; hint: string; action: string; icon: ReactNode }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 py-2.5">
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{title}</span>
          <span className="block truncate text-[11px] text-gray-500">{hint}</span>
        </span>
        <span className="shrink-0 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-gray-200 group-hover:bg-white/[0.08] group-hover:text-white">
          {action}
        </span>
      </Link>
    </li>
  );
}

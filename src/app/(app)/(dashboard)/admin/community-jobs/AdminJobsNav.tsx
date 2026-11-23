"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE = "/admin/community-jobs";
const ITEMS = [
  { href: BASE, label: "Verwaltung" },
  { href: `${BASE}/moderation`, label: "Moderation" },
  { href: `${BASE}/auszahlungen`, label: "Auszahlungen" },
  { href: `${BASE}/auffaelligkeiten`, label: "Auffälligkeiten" },
  { href: `${BASE}/protokoll`, label: "Protokoll" },
  { href: `${BASE}/texte`, label: "Job-Texte" },
  { href: `${BASE}/ideas`, label: "Ideen" },
];

const TAB_ON = "bg-primary text-primary-ink border-primary font-semibold";
const TAB_OFF = "bg-line text-gray-300 border-line-strong hover:text-white";

/** Unter-Navigation der Community-Jobs-Administration — nur auf dem Handy; am Desktop stehen die
 *  Unterseiten eingerückt in der Admin-Seitenleiste (lib/admin-nav.ts, children). */
export default function AdminJobsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Community-Jobs" className="flex flex-wrap gap-1.5 lg:hidden">
      {ITEMS.map(i => {
        const active = i.href === BASE ? pathname === BASE : pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${active ? TAB_ON : TAB_OFF}`}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

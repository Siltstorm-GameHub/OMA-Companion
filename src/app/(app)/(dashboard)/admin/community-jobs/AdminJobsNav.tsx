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

const TAB_ON = "bg-teal-500 text-black border-teal-500 font-semibold";
const TAB_OFF = "bg-white/[0.04] text-gray-300 border-white/10 hover:text-white";

/** Unter-Navigation der Community-Jobs-Administration. */
export default function AdminJobsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Community-Jobs" className="flex flex-wrap gap-1.5">
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

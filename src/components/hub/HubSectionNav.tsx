"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HUB_SUBNAV, isChildActive } from "@/components/shell/nav-config";

/**
 * Reiter des OMA Hubs (Spendenpool · Fanshop · Downloads · Wallpaper-Studio) — nur am Handy/Tablet,
 * gleiche Optik wie Events, Games und Community-Board. Ab lg stehen dieselben Einträge als
 * Untermenü unter "OMA Hub" in der Seitenleiste (nav-config HUB_SUBNAV).
 */
export default function HubSectionNav() {
  const pathname = usePathname() ?? "/hub";
  return (
    <nav aria-label="OMA Hub" className="mb-5 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-line scrollbar-none lg:hidden">
      {HUB_SUBNAV.map((t) => {
        const on = isChildActive(pathname, t);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition-colors ${
              on ? "border-primary text-fg" : "border-transparent text-subtle hover:text-muted"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

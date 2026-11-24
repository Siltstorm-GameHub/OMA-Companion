import Link from "next/link";
import { CalendarDays, Settings, Target } from "@/components/icons";

/**
 * Unterseiten des Events-Bereichs als Reiter — nur am Handy/Tablet. Ab lg stehen dieselben Einträge
 * als Untermenü unter "Events" in der Seitenleiste (components/shell/nav-config.ts → EVENTS_SUBNAV).
 * Squads stehen in der Navigation unter "Community", nicht mehr hier.
 */
const TABS = [
  { key: "events", label: "Events", href: "/events", icon: CalendarDays, auth: false },
  { key: "predictions", label: "Vorhersagen", href: "/events/vorhersagen", icon: Target, auth: false },
  { key: "manage", label: "Verwalten", href: "/events/verwalten", icon: Settings, auth: true },
] as const;

export default function EventsSectionNav({ active, manageCount = 0, loggedIn = true }: {
  active: (typeof TABS)[number]["key"];
  /** Offene Aufgaben in der Verwaltung (Zahl am Reiter "Verwalten") */
  manageCount?: number;
  /** Gäste sehen "Verwalten" nicht */
  loggedIn?: boolean;
}) {
  return (
    <nav aria-label="Events" className="flex gap-1 border-b border-line overflow-x-auto scrollbar-none whitespace-nowrap lg:hidden">
      {TABS.filter(t => loggedIn || !t.auth).map((t) => {
        const on = t.key === active;
        return (
          <Link key={t.key} href={t.href} aria-current={on ? "page" : undefined}
            className={`flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              on ? "border-primary text-fg" : "border-transparent text-subtle hover:text-muted"
            }`}>
            <t.icon className="size-4" />
            {t.label}
            {t.key === "manage" && manageCount > 0 && (
              <span className="ml-0.5 min-w-5 rounded-full bg-warning px-1.5 text-center text-xs font-bold leading-5 tabular-nums text-canvas" aria-label={`${manageCount} offen`}>
                {manageCount > 99 ? "99+" : manageCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

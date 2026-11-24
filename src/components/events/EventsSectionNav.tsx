import Link from "next/link";
import { CalendarDays, Settings, Target, Users } from "@/components/icons";

/** Reiter der Events-Seite als Links — für Unterseiten wie /events/verwalten, die eine eigene Route
 *  haben. Sieht aus wie die Reiter auf /events (EventsTabs, components/admin/Tabs "underline"). */
const TABS = [
  { key: "events", label: "Events", href: "/events", icon: CalendarDays },
  { key: "predictions", label: "Vorhersagen", href: "/events?tab=predictions", icon: Target },
  { key: "squads", label: "Squads", href: "/events?tab=squads", icon: Users },
  { key: "manage", label: "Verwalten", href: "/events/verwalten", icon: Settings },
] as const;

export default function EventsSectionNav({ active, manageCount = 0 }: {
  active: (typeof TABS)[number]["key"];
  /** Offene Aufgaben in der Verwaltung (Zahl am Reiter "Verwalten") */
  manageCount?: number;
}) {
  return (
    <nav aria-label="Events" className="flex gap-1 border-b border-line overflow-x-auto scrollbar-none whitespace-nowrap">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link key={t.key} href={t.href} aria-current={on ? "page" : undefined}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              on ? "border-primary text-fg" : "border-transparent text-subtle hover:text-muted"
            }`}>
            <t.icon className="w-3.5 h-3.5" />
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

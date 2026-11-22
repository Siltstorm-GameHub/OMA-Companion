import Link from "next/link";
import { CalendarDays, Gamepad2, Home, Trophy } from "@/components/icons";

/** Schnelle Wege zurück in die App — für Fehler- und 404-Seiten. */
const LINKS = [
  { href: "/dashboard", label: "Übersicht", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/leaderboard", label: "Rangliste", icon: Trophy },
  { href: "/spiele", label: "Games", icon: Gamepad2 },
];

export default function HelpfulLinks() {
  return (
    <nav aria-label="Weiter zu" className="grid grid-cols-2 gap-2">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className="flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface-2 px-3 text-sm font-semibold text-fg hover:border-line-strong hover:bg-surface-3 transition-colors">
          <Icon className="w-4 h-4 text-primary-fg" /> {label}
        </Link>
      ))}
    </nav>
  );
}

import Link from "next/link";
import OfficeCountBadge from "./OfficeCountBadge";
import RoadmapNewDot from "./RoadmapNewDot";

/**
 * Reiter des Community-Boards (Feed · Büro · Roadmap) — nur am Handy/Tablet, gleiche Optik wie Events und Games.
 * Ab lg stehen dieselben Einträge als Untermenü unter "Community-Board" in der Seitenleiste (nav-config BOARD_SUBNAV).
 */
const TABS = [
  { key: "feed", label: "Feed", href: "/community-board" },
  { key: "buero", label: "Büro", href: "/community-board/buero" },
  { key: "roadmap", label: "Roadmap", href: "/community-board/roadmap" },
] as const;

export type BoardSection = (typeof TABS)[number]["key"];

export default function BoardSectionNav({ active }: { active: BoardSection }) {
  return (
    <nav aria-label="Community-Board" className="flex gap-1 border-b border-line overflow-x-auto scrollbar-none whitespace-nowrap lg:hidden">
      {TABS.map(t => {
        const on = t.key === active;
        return (
          <Link key={t.key} href={t.href} aria-current={on ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center px-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              on ? "border-primary text-fg" : "border-transparent text-subtle hover:text-muted"
            }`}>
            {t.label}
            {t.key === "buero" && <OfficeCountBadge />}
            {t.key === "roadmap" && !on && <RoadmapNewDot />}
          </Link>
        );
      })}
    </nav>
  );
}

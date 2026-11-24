import Link from "next/link";
import OmaWordmark from "@/components/OmaWordmark";
import { GAMES_SUBNAV } from "@/components/shell/nav-config";

export type GamesSection = "uebersicht" | "gameswipe" | "blocks" | "shop";

const KEY_BY_HREF: Record<string, GamesSection> = {
  "/games": "uebersicht",
  "/spiele": "gameswipe",
  "/games/blocks": "blocks",
  "/shop": "shop",
};

/**
 * Reiter des Games-Bereichs (Übersicht · GameSwipe · Blocks · Shop) — nur am Handy/Tablet, gleiche Optik wie
 * die Events-Reiter. Ab lg stehen dieselben Einträge als Untermenü unter "Games" in der Seitenleiste
 * (nav-config GAMES_SUBNAV). Die OMA-Produkte tragen das OMA-Logo vor dem Namen.
 */
export default function GamesSectionTabs({ active }: { active: GamesSection }) {
  return (
    <nav aria-label="Games-Bereich" className="flex gap-1 border-b border-line overflow-x-auto scrollbar-none whitespace-nowrap lg:hidden">
      {GAMES_SUBNAV.map((t) => {
        const key = KEY_BY_HREF[t.href];
        const on = key === active;
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              on ? "border-primary text-fg" : "border-transparent text-subtle hover:text-muted"
            }`}>
            {t.brand ? <OmaWordmark product={t.brand} size="xs" plainName={!on} /> : t.label}
          </Link>
        );
      })}
    </nav>
  );
}

import Link from "next/link";
import CoinIcon from "@/components/CoinIcon";
import { Gamepad2, LayoutGrid, ShoppingBag } from "@/components/icons";
import { prisma } from "@/lib/prisma";

export type GamesSection = "spielen" | "spieleliste" | "shop";

// "Games" in der Navigation öffnet die Spieleliste (was zocken wir?) — die Minispiele (OMA Blocks)
// sind ein Reiter daneben, der Shop gehört dazu, weil man dort die Münzen ausgibt.
const TABS: { key: GamesSection; label: string; href: string; icon: typeof Gamepad2 }[] = [
  { key: "spieleliste", label: "Spieleliste", href: "/spiele", icon: Gamepad2 },
  { key: "spielen", label: "Minispiele", href: "/games", icon: LayoutGrid },
  { key: "shop", label: "Shop", href: "/shop", icon: ShoppingBag },
];

/** Reiter des Games-Bereichs (Spielen · Spieleliste · Shop) — oben auf /games, /spiele und /shop, nur am
 *  Handy/Tablet; ab lg stehen sie als Untermenü unter "Games" in der Seitenleiste (nav-config GAMES_SUBNAV).
 *  Der Shop-Reiter zeigt den Münzstand, damit Spielen und Ausgeben zusammengehören. */
export default async function GamesSectionTabs({ active, userId }: { active: GamesSection; userId?: string | null }) {
  const coins = userId ? (await prisma.user.findUnique({ where: { id: userId }, select: { points: true } }))?.points ?? 0 : null;

  return (
    <nav aria-label="Games-Bereich" className="grid grid-cols-3 gap-1 rounded-card p-1 bg-surface border border-line lg:hidden">
      {TABS.map((t) => {
        const on = t.key === active;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-control px-2 text-sm font-semibold transition-colors min-w-0 ${
              on ? "bg-primary-soft text-primary-fg" : "text-muted hover:text-fg hover:bg-surface-2"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.label}</span>
            {t.key === "shop" && coins !== null && (
              <span className="hidden min-[400px]:flex items-center gap-0.5 text-xs text-amber-300 tabular-nums shrink-0">
                <CoinIcon size={11} /> {coins.toLocaleString("de-DE")}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

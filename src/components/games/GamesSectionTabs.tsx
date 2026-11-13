import Link from "next/link";
import CoinIcon from "@/components/CoinIcon";
import { Gamepad2, LayoutGrid, ShoppingBag } from "@/components/icons";
import { prisma } from "@/lib/prisma";

export type GamesSection = "spielen" | "spieleliste" | "shop";

const TABS: { key: GamesSection; label: string; href: string; icon: typeof Gamepad2 }[] = [
  { key: "spielen", label: "Spielen", href: "/games", icon: LayoutGrid },
  { key: "spieleliste", label: "Spieleliste", href: "/spiele", icon: Gamepad2 },
  { key: "shop", label: "Shop", href: "/shop", icon: ShoppingBag },
];

/** Reiter des Games-Bereichs (Spielen · Spieleliste · Shop) — oben auf /games, /spiele und /shop.
 *  Der Shop-Reiter zeigt den Münzstand, damit Spielen und Ausgeben zusammengehören. */
export default async function GamesSectionTabs({ active, userId }: { active: GamesSection; userId?: string | null }) {
  const coins = userId ? (await prisma.user.findUnique({ where: { id: userId }, select: { points: true } }))?.points ?? 0 : null;

  return (
    <nav aria-label="Games-Bereich" className="grid grid-cols-3 gap-1 rounded-2xl p-1 bg-white/[0.03] border border-white/[0.06]">
      {TABS.map((t) => {
        const on = t.key === active;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs sm:text-sm font-semibold transition-colors min-w-0 ${
              on ? "bg-teal-500/15 text-white ring-1 ring-teal-400/40" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${on ? "text-teal-300" : ""}`} />
            <span className="truncate">{t.label}</span>
            {t.key === "shop" && coins !== null && (
              <span className="hidden min-[400px]:flex items-center gap-0.5 text-[11px] text-amber-300 tabular-nums shrink-0">
                <CoinIcon size={11} /> {coins.toLocaleString("de-DE")}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";
// Games-Hub: Umschalter zwischen den Spielen (OMA Gems, OMA Blocks). ?spiel=blocks öffnet OMA Blocks.

import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Gem, LayoutGrid } from "@/components/icons";

type GameKey = "gems" | "blocks";

function gameFromParam(v: string | null): GameKey {
  return v === "blocks" ? "blocks" : "gems";
}

const GAMES: { key: GameKey; label: string; sub: string; icon: typeof Gem; color: string }[] = [
  { key: "gems", label: "OMA Gems", sub: "Match-3-Kämpfe", icon: Gem, color: "20,184,166" },
  { key: "blocks", label: "OMA Blocks", sub: "Blöcke stapeln · Versus", icon: LayoutGrid, color: "192,132,252" },
];

function GamesSwitcherInner({ gems, blocks }: { gems: ReactNode; blocks: ReactNode }) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("spiel");
  const [active, setActive] = useState<GameKey>(() => gameFromParam(requested));
  const [seen, setSeen] = useState(requested);
  if (seen !== requested) {
    setSeen(requested);
    setActive(gameFromParam(requested));
  }

  const select = (key: GameKey) => {
    setActive(key);
    const url = new URL(window.location.href);
    if (key === "gems") url.searchParams.delete("spiel");
    else url.searchParams.set("spiel", key);
    url.searchParams.delete("tab");
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {GAMES.map((g) => {
          const on = g.key === active;
          const Icon = g.icon;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => select(g.key)}
              aria-pressed={on}
              className={`rounded-2xl p-3 flex items-center gap-3 text-left transition-colors border ${on ? "bg-white/[0.06]" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"}`}
              style={on ? { borderColor: `rgba(${g.color},0.45)`, boxShadow: `0 0 24px rgba(${g.color},0.12)` } : undefined}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `rgba(${g.color},0.12)`, border: `1px solid rgba(${g.color},0.25)`, color: `rgb(${g.color})` }}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base font-bold text-white truncate">{g.label}</span>
                <span className="block text-[11px] text-gray-500 truncate">{g.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className={active === "gems" ? "" : "hidden"}>{gems}</div>
      <div className={active === "blocks" ? "" : "hidden"}>{blocks}</div>
    </div>
  );
}

export default function GamesSwitcher(props: { gems: ReactNode; blocks: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GamesSwitcherInner {...props} />
    </Suspense>
  );
}

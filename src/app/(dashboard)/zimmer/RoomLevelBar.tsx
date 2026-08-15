import { Home, Crown } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { roomLevel, roomInvestment, ROOM_LEVEL_THRESHOLDS, type PlacedItem } from "@/lib/room-layout";
import { ROOM_LEVEL_LABEL } from "./RoomLevelFixtures";

/**
 * Zimmer-Ausbaustufe als sichtbares Fortschrittsziel. `roomLevel()` steuerte
 * bisher nur die Optik von Deckenlampe/Fenster (RoomLevelFixtures.tsx) — hier
 * wird dieselbe Zahl zum eigenständigen, sofort sichtbaren Ziel: jeder Kauf
 * zählt sichtbar, unabhängig vom trägeren Turnier-Rang.
 */
export default function RoomLevelBar({ placed }: { placed: PlacedItem[] }) {
  const total = roomInvestment(placed);
  const level = roomLevel(placed);
  const maxLevel = ROOM_LEVEL_THRESHOLDS.length - 1;
  const isMax = level >= maxLevel;

  const floor = ROOM_LEVEL_THRESHOLDS[level];
  const ceil  = ROOM_LEVEL_THRESHOLDS[level + 1] ?? floor;
  const pct   = isMax ? 100 : Math.min(100, Math.round(((total - floor) / (ceil - floor)) * 100));

  return (
    <div className="glass card-shine rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          {isMax ? <Crown className="w-4 h-4 text-amber-400" /> : <Home className="w-4 h-4 text-violet-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">
              Ausbaustufe {level + 1}/{maxLevel + 1}
            </p>
            <span className="text-[11px] text-gray-500">— {ROOM_LEVEL_LABEL[level]}</span>
          </div>
          {isMax ? (
            <p className="text-[11px] text-amber-400 mt-0.5">Voll ausgebaut — mehr geht nicht rein</p>
          ) : (
            <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
              noch
              <span className="inline-flex items-center gap-0.5 text-gray-400 font-medium">
                {(ceil - total).toLocaleString("de-DE")}<CoinIcon size={10} />
              </span>
              bis {ROOM_LEVEL_LABEL[level + 1]}
            </p>
          )}
        </div>
        <span className="text-xs font-bold text-violet-400 tabular-nums shrink-0">{pct}%</span>
      </div>

      <div className="mt-2.5 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-violet-500 to-teal-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

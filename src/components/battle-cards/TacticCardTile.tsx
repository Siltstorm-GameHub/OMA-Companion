"use client";

// ============================================
// Taktik-Karten-Kachel (Items & Fallen, OMA Duels)
// ============================================
// Optisches Gegenstück zu CardTile.tsx für Taktik-Karten — dieselbe Kachel-
// Sprache (card-cut-sm-Zuschnitt, aspect-[3/4], Badge unten links, Name in
// font-battle darunter), aber kind-getönt (Item/Falle) statt klassen-getönt,
// da Taktik-Karten keine Einheiten-Stats/Level haben und daher nicht durch
// CardTile selbst (das BattleCardData voraussetzt) dargestellt werden können.

import { MOBA_ICON } from "@/lib/battle-cards/moba-icons";

export interface TacticCardTileData {
  id: string;
  name: string;
  kind: "INSTANT" | "TRAP";
  imageUrl?: string | null;
}

export default function TacticCardTile({
  card,
  selected = false,
  disabled = false,
  onClick,
}: {
  card: TacticCardTileData;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const isTrap = card.kind === "TRAP";
  const accent = isTrap ? "#f43f5e" : "#f59e0b";
  const iconSrc = isTrap ? MOBA_ICON.shield : MOBA_ICON.attack;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 w-full text-left disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label={`${card.name} — ${isTrap ? "Falle" : "Item"}`}
    >
      <div
        className="card-cut-sm relative w-full aspect-[3/4] overflow-hidden flex items-center justify-center"
        style={{
          background: `linear-gradient(160deg, ${accent}3a, rgba(12,12,16,0.92))`,
          boxShadow: selected ? `0 0 0 2px ${accent}, 0 4px 14px rgba(0,0,0,0.55)` : "0 4px 14px rgba(0,0,0,0.55)",
        }}
      >
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <img src={iconSrc} alt="" aria-hidden className="w-8 h-8 object-contain" style={{ opacity: 0.7 }} />
        )}
        <span
          className="absolute bottom-1 left-1 text-[9px] font-black leading-none px-1.5 py-1 rounded-md bg-black/70 backdrop-blur-sm"
          style={{ color: accent }}
        >
          {isTrap ? "Falle" : "Item"}
        </span>
      </div>
      <p className="font-battle text-[11px] truncate w-full text-center text-white">{card.name}</p>
    </button>
  );
}

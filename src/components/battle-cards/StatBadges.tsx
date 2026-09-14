// ============================================
// ATK/DEF-Badges (OMA Duels)
// ============================================
// Kompakte Anzeige der Kampf-Werte — im Deck-Editor (Basiswerte auf
// gewählter Stufe) und im laufenden Duell (Feld-Einheiten inkl. aktiver
// Taktikkarten-Buffs/-Debuffs, Handkarten auf Basiswerte) gleichermaßen
// genutzt, seit die Verteidigungs-/Kampfauflösung von einem direkten
// ATK-vs-DEF-Vergleich abhängt statt von unsichtbaren internen Werten.

import { MOBA_ICON } from "@/lib/battle-cards/moba-icons";

export default function StatBadges({
  attack,
  defense,
  highlight,
}: {
  attack: number;
  defense: number;
  /** Welcher Wert für die aktuelle Aktion tatsächlich zählt — der andere wird
   *  verblasst dargestellt, damit ohne Erklärtext sofort klar ist, worauf es
   *  gerade ankommt (siehe DuelLiveView.tsx: eigene ausgewählte Angreifer
   *  zeigen immer ATK, gegnerische Einheiten je nach ihrer Stellung ATK oder
   *  DEF). `undefined`/`null` zeigt beide neutral (keine aktive Aktion). */
  highlight?: "attack" | "defense" | null;
}) {
  const attackFaded = highlight === "defense";
  const defenseFaded = highlight === "attack";
  const attackActive = highlight === "attack";
  const defenseActive = highlight === "defense";
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex items-center gap-0.5 text-[10px] font-bold rounded px-1 py-0.5 transition-all ${
          attackActive
            ? "text-rose-100 bg-rose-500/90 ring-2 ring-rose-300 scale-110 duel-stat-pop"
            : attackFaded
              ? "text-rose-300/40 bg-rose-950/30 grayscale opacity-50"
              : "text-rose-200 bg-rose-950/70"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MOBA_ICON.sword} alt="ATK" className="w-2.5 h-2.5 object-contain" />
        {attack}
      </span>
      <span
        className={`flex items-center gap-0.5 text-[10px] font-bold rounded px-1 py-0.5 transition-all ${
          defenseActive
            ? "text-sky-100 bg-sky-500/90 ring-2 ring-sky-300 scale-110 duel-stat-pop"
            : defenseFaded
              ? "text-sky-300/40 bg-sky-950/30 grayscale opacity-50"
              : "text-sky-200 bg-sky-950/70"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MOBA_ICON.shield} alt="DEF" className="w-2.5 h-2.5 object-contain" />
        {defense}
      </span>
    </div>
  );
}

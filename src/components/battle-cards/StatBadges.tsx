// ============================================
// ATK/DEF-Badges (OMA Duels)
// ============================================
// Kompakte Anzeige der Kampf-Werte — im Deck-Editor (Basiswerte auf
// gewählter Stufe) und im laufenden Duell (Feld-Einheiten inkl. aktiver
// Taktikkarten-Buffs/-Debuffs, Handkarten auf Basiswerte) gleichermaßen
// genutzt, seit die Verteidigungs-/Kampfauflösung von einem direkten
// ATK-vs-DEF-Vergleich abhängt statt von unsichtbaren internen Werten.

import { MOBA_ICON } from "@/lib/battle-cards/moba-icons";

export default function StatBadges({ attack, defense }: { attack: number; defense: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-200 bg-rose-950/70 rounded px-1 py-0.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MOBA_ICON.sword} alt="ATK" className="w-2.5 h-2.5 object-contain" />
        {attack}
      </span>
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-sky-200 bg-sky-950/70 rounded px-1 py-0.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MOBA_ICON.shield} alt="DEF" className="w-2.5 h-2.5 object-contain" />
        {defense}
      </span>
    </div>
  );
}

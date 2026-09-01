// ============================================
// Battle-Cards-Wortmarke — Header
// ============================================
// Nutzt das echte OMA-Logo (BRAND_LOGO, wie auf der Login-Seite/CoverBrandBadge)
// statt eines eigens generierten Emblems — plus "Battle Cards"-Schriftzug in der
// Battle-Cards-eigenen Display-Schrift (siehe .font-battle in globals.css).

import { BRAND_LOGO } from "@/lib/brand";

export default function BattleCardsLogo() {
  return (
    <div className="flex items-center justify-center gap-2.5 pb-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND_LOGO} alt="OMA" className="h-10 sm:h-12 w-auto object-contain" />
      <span className="font-battle text-lg sm:text-xl text-white uppercase tracking-wide">Battle Cards</span>
    </div>
  );
}

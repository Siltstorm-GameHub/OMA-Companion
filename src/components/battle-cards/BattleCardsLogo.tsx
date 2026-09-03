// ============================================
// Battle-Cards-Wortmarke — Header
// ============================================
// Nutzt das echte OMA-Logo (BRAND_LOGO, wie auf der Login-Seite/CoverBrandBadge)
// statt eines eigens generierten Emblems — plus "Battle Cards"-Schriftzug in der
// Battle-Cards-eigenen Display-Schrift (siehe .font-battle in globals.css).

"use client";

import { motion } from "motion/react";
import { BRAND_LOGO } from "@/lib/brand";

export default function BattleCardsLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex items-center justify-center gap-2.5 pb-2"
    >
      <div className="relative shrink-0">
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(20,184,166,0.35), transparent 70%)", filter: "blur(6px)" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_LOGO} alt="OMA" className="relative h-10 sm:h-12 w-auto object-contain" />
      </div>
      <span className="font-battle text-lg sm:text-xl text-white uppercase tracking-wide text-gradient-gaming">
        Battle Cards
      </span>
    </motion.div>
  );
}

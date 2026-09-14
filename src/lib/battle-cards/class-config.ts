// ============================================
// Zentrale Klassen-Konfiguration (Tank/Damage Dealer/Support)
// ============================================
// War bisher dreifach dupliziert (BattleCardView.tsx, BattleScreen.tsx,
// StarterPickFlow.tsx) mit jeweils leicht unterschiedlicher Typisierung.
// Einheitliche Quelle für Farbe/Icon/Label — die Klassenfarben selbst
// ändern sich nicht durchs MOBA-Reskin, nur der Rahmen drumherum.

import { Shield, Swords, HeartPulse } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UnitClassKey = "TANK" | "DAMAGE_DEALER" | "SUPPORT";

export const CLASS_CONFIG: Record<UnitClassKey, { label: string; color: string; icon: LucideIcon }> = {
  TANK: { label: "Tank", color: "#14b8a6", icon: Shield },
  DAMAGE_DEALER: { label: "Damage Dealer", color: "#ef4444", icon: Swords },
  SUPPORT: { label: "Support", color: "#8b5cf6", icon: HeartPulse },
};

/** Fällt auf die Tank-Konfiguration zurück, falls `cls` unerwartet keiner der
 *  drei bekannten Klassen entspricht (z.B. bei älteren/fehlerhaften Datensätzen). */
export function getClassConfig(cls: UnitClassKey): { label: string; color: string; icon: LucideIcon } {
  return CLASS_CONFIG[cls] ?? CLASS_CONFIG.TANK;
}

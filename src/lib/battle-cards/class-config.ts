// ============================================
// Zentrale Klassen-Konfiguration (Tank/Damage Dealer/Support)
// ============================================
// War bisher dreifach dupliziert (BattleCardView.tsx, BattleScreen.tsx,
// StarterPickFlow.tsx) mit jeweils leicht unterschiedlicher Typisierung.
// Einheitliche Quelle für Farbe/Icon/Label — die Klassenfarben selbst
// ändern sich nicht durchs MOBA-Reskin, nur der Rahmen drumherum.
//
// `icon` ist ein Bildpfad (MOBA-Style-Kit-Asset) statt eines Lucide-
// Komponenten — jede Klasse bekommt ein eigenes Icon (Schild/Schwert/Magie)
// statt eines einzigen, per `color` eingefärbten Universal-Icons, da die
// Kit-Icons ihren Glow bereits eingebrannt haben und nicht umfärbbar sind.

import { MOBA_ICON } from "./moba-icons";

export type UnitClassKey = "TANK" | "DAMAGE_DEALER" | "SUPPORT";

export const CLASS_CONFIG: Record<UnitClassKey, { label: string; color: string; icon: string }> = {
  TANK: { label: "Tank", color: "#14b8a6", icon: MOBA_ICON.shield },
  DAMAGE_DEALER: { label: "Damage Dealer", color: "#ef4444", icon: MOBA_ICON.sword },
  SUPPORT: { label: "Support", color: "#8b5cf6", icon: MOBA_ICON.magic },
};

/** Fällt auf die Tank-Konfiguration zurück, falls `cls` unerwartet keiner der
 *  drei bekannten Klassen entspricht (z.B. bei älteren/fehlerhaften Datensätzen). */
export function getClassConfig(cls: UnitClassKey): { label: string; color: string; icon: string } {
  return CLASS_CONFIG[cls] ?? CLASS_CONFIG.TANK;
}

// ============================================
// Zentrale Klassen-Konfiguration (Tank/Damage Dealer/Support)
// ============================================
// War bisher dreifach dupliziert (BattleCardView.tsx, BattleScreen.tsx,
// StarterPickFlow.tsx) mit jeweils leicht unterschiedlicher Typisierung.
// Einheitliche Quelle für Farbe/Icon/Label — die Klassenfarben selbst
// ändern sich nicht durchs MOBA-Reskin, nur der Rahmen drumherum.
//
// `icon` ist ein Bildpfad statt eines Lucide-Komponenten — jede Klasse bekommt
// ein eigenes, bereits in der Klassenfarbe eingefärbtes Icon (Schild/Schwert/Stab).

export type UnitClassKey = "TANK" | "DAMAGE_DEALER" | "SUPPORT";

/** Avatar-RPG-Klassen-Icons (Paladin/Krieger-Schwert/Magier-Stab), auf die jeweilige
 *  Klassenfarbe umgefärbt — die Karten-Icons; die Gems auf dem Brett nutzen weiter
 *  die Genre-Icons (siehe TILE_ICON in BoardMatch3.tsx). */
const CLASS_ICON_BASE = "/battle-cards/class-icons";

export const CLASS_CONFIG: Record<UnitClassKey, { label: string; color: string; icon: string }> = {
  TANK: { label: "Tank", color: "#14b8a6", icon: `${CLASS_ICON_BASE}/tank.png` },
  DAMAGE_DEALER: { label: "Damage Dealer", color: "#ef4444", icon: `${CLASS_ICON_BASE}/damage-dealer.png` },
  SUPPORT: { label: "Support", color: "#8b5cf6", icon: `${CLASS_ICON_BASE}/support.png` },
};

/** Fällt auf die Tank-Konfiguration zurück, falls `cls` unerwartet keiner der
 *  drei bekannten Klassen entspricht (z.B. bei älteren/fehlerhaften Datensätzen). */
export function getClassConfig(cls: UnitClassKey): { label: string; color: string; icon: string } {
  return CLASS_CONFIG[cls] ?? CLASS_CONFIG.TANK;
}

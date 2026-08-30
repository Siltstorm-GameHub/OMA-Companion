// ============================================
// Deck-Synergien — Team-Boni je nach Klassen-Zusammensetzung der Aufstellung
// ============================================
// Rein additive Stat-Multiplikatoren, angewendet auf die fertigen
// BattleUnitDefinition-Objekte VOR dem Kampf. Kein Eingriff in die
// Kampf-Engine selbst nötig — Boni stacken, falls mehrere Bedingungen
// gleichzeitig zutreffen (z.B. Trinity + 2 Tanks).

import type { BattleUnitDefinition, UnitClass } from "@/lib/battle-engine/types";

export interface SynergyBonus {
  key: string;
  label: string;
  description: string;
  appliesTo: UnitClass[] | "all";
  hpMult?: number;
  attackMult?: number;
  defenseMult?: number;
}

export function computeSynergies(classes: UnitClass[]): SynergyBonus[] {
  const bonuses: SynergyBonus[] = [];
  const count = (cls: UnitClass) => classes.filter((c) => c === cls).length;

  const hasTrinity =
    classes.includes("TANK") && classes.includes("DAMAGE_DEALER") && classes.includes("SUPPORT");
  if (hasTrinity) {
    bonuses.push({
      key: "trinity",
      label: "Ausgewogenes Team",
      description: "Mind. 1 Tank, 1 Damage Dealer und 1 Support in der Aufstellung: +8% HP & Angriff für alle Karten.",
      appliesTo: "all",
      hpMult: 1.08,
      attackMult: 1.08,
    });
  }
  if (count("TANK") >= 2) {
    bonuses.push({
      key: "bulwark",
      label: "Bollwerk",
      description: "2+ Tanks in der Aufstellung: +20% HP für alle Tanks.",
      appliesTo: ["TANK"],
      hpMult: 1.2,
    });
  }
  if (count("DAMAGE_DEALER") >= 2) {
    bonuses.push({
      key: "onslaught",
      label: "Sturmangriff",
      description: "2+ Damage Dealer in der Aufstellung: +20% Angriff für alle Damage Dealer.",
      appliesTo: ["DAMAGE_DEALER"],
      attackMult: 1.2,
    });
  }
  if (count("SUPPORT") >= 2) {
    bonuses.push({
      key: "bastion",
      label: "Rückhalt",
      description: "2+ Support in der Aufstellung: +20% Verteidigung für alle Support.",
      appliesTo: ["SUPPORT"],
      defenseMult: 1.2,
    });
  }

  return bonuses;
}

/** Wendet alle zutreffenden Synergie-Boni auf die fertigen Kampf-Einheiten an. */
export function applySynergies(units: BattleUnitDefinition[]): {
  units: BattleUnitDefinition[];
  bonuses: SynergyBonus[];
} {
  const bonuses = computeSynergies(units.map((u) => u.class));
  if (bonuses.length === 0) return { units, bonuses };

  const boosted = units.map((unit) => {
    let hpMult = 1;
    let attackMult = 1;
    let defenseMult = 1;
    for (const bonus of bonuses) {
      if (bonus.appliesTo !== "all" && !bonus.appliesTo.includes(unit.class)) continue;
      hpMult *= bonus.hpMult ?? 1;
      attackMult *= bonus.attackMult ?? 1;
      defenseMult *= bonus.defenseMult ?? 1;
    }
    if (hpMult === 1 && attackMult === 1 && defenseMult === 1) return unit;
    return {
      ...unit,
      baseHp: Math.round(unit.baseHp * hpMult),
      baseAttack: Math.round(unit.baseAttack * attackMult),
      baseDefense: Math.round(unit.baseDefense * defenseMult),
    };
  });

  return { units: boosted, bonuses };
}

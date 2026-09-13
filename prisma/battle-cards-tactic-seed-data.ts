// ============================================
// Taktik-Karten (Items & Fallen) für OMA Duels — Content-Entwurf
// ============================================
// Gaming-Kultur, humorvoll, gleicher Ton wie puzzle-monsters.ts (Alltags-
// gegenstände/-typen mit sarkastischem Bezug — hier: Zocker-Alltag statt
// Alltagsgegenstände). Alle Effekte nutzen ausschließlich die bestehenden
// Effect-Typen aus battle-engine/types.ts (damage/heal/statModifier/shield/
// rageChange) — keine Engine-Änderungen nötig, um diese Karten spielbar zu
// machen.
//
// `valuePerLevel` hat hier bewusst nur 1 Eintrag: Taktik-Karten haben (anders
// als Einheiten-Karten) kein Stufen-System, executeEffect() wird für sie immer
// mit level=1 aufgerufen (siehe duels-live.ts), Index 0 greift also immer.
//
// Werte sind ein erster Entwurf und noch nicht balanciert (siehe Phase 3 im
// Implementierungsplan — Balancing-Pass erst mit echten Matchdaten sinnvoll).

import type { TacticCardKind } from "@prisma/client";
import type { Effect, TrapTriggerCondition } from "../src/lib/battle-engine/types";

export interface TacticCardSeed {
  name: string;
  kind: TacticCardKind;
  flavorText: string;
  description: string;
  effects: Effect[];
  triggerCondition: TrapTriggerCondition | null;
}

export const TACTIC_CARDS: TacticCardSeed[] = [
  // ── Items (INSTANT) ──────────────────────────────────────────────────────
  {
    name: "Energy-Drink XXL",
    kind: "INSTANT",
    flavorText: "0 Kalorien, 400% Zucker, 100% schlechte Idee.",
    description: "Verleiht der eigenen aktiven Einheit sofort Rage.",
    effects: [{ type: "rageChange", target: { kind: "self" }, valuePerLevel: [25] }],
    triggerCondition: null,
  },
  {
    name: "Protein-Shake Pre-Workout",
    kind: "INSTANT",
    flavorText: "Schmeckt nach Kreide, wirkt trotzdem.",
    description: "Heilt das gesamte eigene Feld leicht.",
    effects: [{ type: "heal", target: { kind: "allAllies" }, valuePerLevel: [80] }],
    triggerCondition: null,
  },
  {
    name: "Cheat-Code eingegeben",
    kind: "INSTANT",
    flavorText: "↑↑↓↓←→←→BA — funktioniert nur, wenn keiner hinschaut.",
    description: "Erhöht den Angriff der eigenen aktiven Einheit für 2 Runden deutlich.",
    effects: [
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "attack",
        mode: "percent",
        valuePerLevel: [0.3],
        duration: 2,
      },
    ],
    triggerCondition: null,
  },
  {
    name: "Trash-Talk im Voice-Chat",
    kind: "INSTANT",
    flavorText: "\"ez clap\" — bevor überhaupt eine Runde vorbei ist.",
    description: "Senkt die Verteidigung aller gegnerischen Einheiten für 2 Runden.",
    effects: [
      {
        type: "statModifier",
        target: { kind: "allEnemies" },
        stat: "defense",
        mode: "percent",
        valuePerLevel: [-0.15],
        duration: 2,
      },
    ],
    triggerCondition: null,
  },
  {
    name: "WLAN-Turbo (Router neu gestartet)",
    kind: "INSTANT",
    flavorText: "Aus und wieder an — der Klassiker.",
    description: "Erhöht die Geschwindigkeit der eigenen aktiven Einheit für 2 Runden.",
    effects: [
      {
        type: "statModifier",
        target: { kind: "self" },
        stat: "speed",
        mode: "flat",
        valuePerLevel: [15],
        duration: 2,
      },
    ],
    triggerCondition: null,
  },

  // ── Fallen (TRAP) — verdeckt gesetzt, lösen bei einer gegnerischen Aktion aus ──
  {
    name: "Server-Lag",
    kind: "TRAP",
    flavorText: "256ms Ping, gefühlt 3 Sekunden.",
    description: "Löst aus, sobald der Gegner angreift — verlangsamt danach alle gegnerischen Einheiten für 1 Runde.",
    effects: [
      {
        type: "statModifier",
        target: { kind: "allEnemies" },
        stat: "speed",
        mode: "flat",
        valuePerLevel: [-20],
        duration: 1,
      },
    ],
    triggerCondition: { type: "onEnemyAttack" },
  },
  {
    name: "Rage Quit",
    kind: "TRAP",
    flavorText: "Controller fliegt, Konsole bleibt aus — Kollateralschaden inklusive.",
    description: "Löst aus, sobald der Gegner angreift — fügt der gegnerischen Einheit mit der niedrigsten Verteidigung Schaden zu.",
    effects: [
      {
        type: "damage",
        target: { kind: "singleEnemy", select: "lowestDefense" },
        valuePerLevel: [60],
        canCrit: false,
      },
    ],
    triggerCondition: { type: "onEnemyAttack" },
  },
  {
    name: "Blue Screen of Death",
    kind: "TRAP",
    flavorText: "Ein blauer Bildschirm sagt mehr als tausend Worte.",
    description: "Löst aus, sobald der Gegner eine Einheit beschwört — schwächt danach den Angriff aller gegnerischen Einheiten für 2 Runden.",
    effects: [
      {
        type: "statModifier",
        target: { kind: "allEnemies" },
        stat: "attack",
        mode: "percent",
        valuePerLevel: [-0.2],
        duration: 2,
      },
    ],
    triggerCondition: { type: "onEnemySummon" },
  },
  {
    name: "Report-Button gedrückt",
    kind: "TRAP",
    flavorText: "Wegen \"unsportlichem Verhalten\" gemeldet.",
    description: "Löst aus, sobald der Gegner ein Ultimate einsetzt — schwächt dessen Angriff kurzzeitig.",
    effects: [
      {
        type: "statModifier",
        target: { kind: "allEnemies" },
        stat: "attack",
        mode: "percent",
        valuePerLevel: [-0.25],
        duration: 1,
      },
    ],
    triggerCondition: { type: "onEnemyUltimate" },
  },
  {
    name: "Frische Kekse fürs Team",
    kind: "TRAP",
    flavorText: "Selbstgebacken, sofort verteilt — die Moral steigt schlagartig.",
    description: "Löst aus, sobald der Gegner angreift — gibt dem eigenen Feld einen Schild.",
    effects: [{ type: "shield", target: { kind: "allAllies" }, valuePerLevel: [60] }],
    triggerCondition: { type: "onEnemyAttack" },
  },
];

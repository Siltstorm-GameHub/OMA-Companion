// ============================================
// Battle-Engine — Laufzeit-Validierung der Skill-JSON-Felder
// ============================================
// Card.passivePositive/passiveNegative/activeSkill/ultimateSkill sind in
// Prisma nur `Json` — hier wird beim Laden aus der DB geprüft, dass sie
// tatsächlich zur Effect-Struktur der Engine passen. Kampf-Logik läuft
// serverseitig aus Cheat-Schutz-Gründen (siehe PROJECT_CONTEXT.md) — dazu
// gehört auch, den Daten aus der DB nicht blind zu vertrauen.

import { z } from "zod";

const effectTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self") }),
  z.object({
    kind: z.literal("singleEnemy"),
    select: z.enum(["lowestDefense", "highestHp", "lowestHp", "highestAttack", "random"]),
  }),
  z.object({ kind: z.literal("allEnemies") }),
  z.object({
    kind: z.literal("singleAlly"),
    select: z.enum(["self", "lowestHpPercent", "random"]),
  }),
  z.object({ kind: z.literal("allAllies") }),
]);

const valuePerLevelSchema = z.array(z.number()).min(1).max(5);

// Exportiert, damit Taktik-Karten (siehe tacticEffectsSchema unten) dieselbe
// Effect-Struktur validieren, statt sie zu duplizieren.
export const effectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("damage"),
    target: effectTargetSchema,
    valuePerLevel: valuePerLevelSchema,
    canCrit: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("heal"),
    target: effectTargetSchema,
    valuePerLevel: valuePerLevelSchema,
  }),
  z.object({
    type: z.literal("statModifier"),
    target: effectTargetSchema,
    stat: z.enum(["attack", "defense", "speed"]),
    mode: z.enum(["flat", "percent"]),
    valuePerLevel: valuePerLevelSchema,
    duration: z.union([z.number().int().positive(), z.literal("battle")]),
  }),
  z.object({
    type: z.literal("shield"),
    target: effectTargetSchema,
    valuePerLevel: valuePerLevelSchema,
  }),
  z.object({
    type: z.literal("rageChange"),
    target: effectTargetSchema,
    valuePerLevel: valuePerLevelSchema,
  }),
]);

export const activeSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  cost: z.number().int().nonnegative(),
  effects: z.array(effectSchema),
});

export const passiveSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  trigger: z.enum(["battleStart", "turnStart", "turnEnd", "onDealDamage", "onTakeDamage", "roundEnd"]),
  effects: z.array(effectSchema),
});

export class InvalidSkillDataError extends Error {
  constructor(context: string, cause: z.ZodError) {
    super(`Ungültige Skill-Daten (${context}): ${cause.message}`);
    this.name = "InvalidSkillDataError";
  }
}

export function parseActiveSkill(json: unknown, context: string) {
  const result = activeSkillSchema.safeParse(json);
  if (!result.success) throw new InvalidSkillDataError(context, result.error);
  return result.data;
}

export function parsePassiveSkill(json: unknown, context: string) {
  const result = passiveSkillSchema.safeParse(json);
  if (!result.success) throw new InvalidSkillDataError(context, result.error);
  return result.data;
}

// ---------- Taktik-Karten (OMA Duels — Items/Fallen) ----------

const tacticEffectsSchema = z.array(effectSchema);

const tacticTriggerConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("onEnemyAttack") }),
  z.object({ type: z.literal("onEnemySummon") }),
  z.object({ type: z.literal("onEnemyUltimate") }),
  z.object({ type: z.literal("onEnemyStanceChange") }),
]);

export function parseTacticEffects(json: unknown, context: string) {
  const result = tacticEffectsSchema.safeParse(json);
  if (!result.success) throw new InvalidSkillDataError(context, result.error);
  return result.data;
}

/** `json` ist bei INSTANT-Taktik-Karten null/undefined (kein Trigger nötig). */
export function parseTacticTriggerCondition(json: unknown, context: string) {
  if (json === null || json === undefined) return undefined;
  const result = tacticTriggerConditionSchema.safeParse(json);
  if (!result.success) throw new InvalidSkillDataError(context, result.error);
  return result.data;
}

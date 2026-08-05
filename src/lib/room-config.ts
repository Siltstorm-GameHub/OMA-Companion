import { prisma } from "./prisma";
import { WAGE_CAP_HOURS_DEFAULT } from "./jobs";

/**
 * Balancing- und Rollout-Schalter des Gaming-Zimmers.
 * Alle Werte liegen in der BotConfig-Key-Value-Tabelle — Nachjustieren geht
 * damit über das Admin-Panel und braucht kein Deploy. Aufbau bewusst identisch
 * zu src/lib/minigames-config.ts.
 */
export interface RoomConfig {
  /** false = nur Admins sehen das Zimmer (Standard beim ersten Rollout). */
  roomEnabled:       boolean;
  jobsEnabled:       boolean;
  /** Ab so vielen Stunden verfällt unabgeholter Lohn. */
  wageCapHours:      number;
  /** Globaler Lohn-Multiplikator in Prozent (100 = unverändert). */
  wageMultiplierPct: number;
  /** Sperrfrist nach der Einstellung, bevor ein Jobwechsel möglich ist. */
  hireLockHours:     number;
}

const DEFAULTS: RoomConfig = {
  roomEnabled:       false,
  jobsEnabled:       true,
  wageCapHours:      WAGE_CAP_HOURS_DEFAULT,
  wageMultiplierPct: 100,
  hireLockHours:     6,
};

const KEYS = {
  roomEnabled:       "room_enabled",
  jobsEnabled:       "room_jobs_enabled",
  wageCapHours:      "room_wage_cap_hours",
  wageMultiplierPct: "room_wage_multiplier_pct",
  hireLockHours:     "room_hire_lock_hours",
} as const;

export async function getRoomConfig(): Promise<RoomConfig> {
  const rows = await prisma.botConfig
    .findMany({ where: { key: { in: Object.values(KEYS) } } })
    .catch(() => []);
  const map = new Map(rows.map(r => [r.key, r.value]));

  const bool = (key: string, fallback: boolean) => {
    const v = map.get(key);
    return v === undefined ? fallback : v === "true";
  };
  const num = (key: string, fallback: number) => {
    const v = map.get(key);
    if (v === undefined) return fallback;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    roomEnabled:       bool(KEYS.roomEnabled, DEFAULTS.roomEnabled),
    jobsEnabled:       bool(KEYS.jobsEnabled, DEFAULTS.jobsEnabled),
    wageCapHours:      num(KEYS.wageCapHours, DEFAULTS.wageCapHours),
    wageMultiplierPct: num(KEYS.wageMultiplierPct, DEFAULTS.wageMultiplierPct),
    hireLockHours:     num(KEYS.hireLockHours, DEFAULTS.hireLockHours),
  };
}

/**
 * Darf dieser User das Zimmer sehen?
 * Solange `room_enabled` aus ist, bleibt das Feature auf Admins beschränkt —
 * so lässt es sich in Ruhe fertigbauen, während die App live ist.
 */
export function roomVisibleFor(cfg: RoomConfig, role: string | null | undefined): boolean {
  return cfg.roomEnabled || role === "admin";
}

/** Admin-Update: patcht beliebige Werte, jeweils als eigener BotConfig-Upsert. */
export async function updateRoomConfig(patch: Partial<RoomConfig>): Promise<void> {
  const entries: [string, string][] = [];
  for (const field of Object.keys(KEYS) as (keyof RoomConfig)[]) {
    const value = patch[field];
    if (value !== undefined) entries.push([KEYS[field], String(value)]);
  }

  await Promise.all(entries.map(([key, value]) =>
    prisma.botConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
  ));
}

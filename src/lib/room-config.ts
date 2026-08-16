import { prisma } from "./prisma";
import { WAGE_CAP_HOURS_DEFAULT } from "./jobs";
import { ROOM_ITEMS, type RoomItemDef } from "./room-items";
import { ROOM_LEVEL_THRESHOLDS } from "./room-layout";

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
  /**
   * Investitionssumme (Münzen), ab der Stufe 1/2/3 erreicht ist — dieselbe
   * Bedeutung wie ROOM_LEVEL_THRESHOLDS[1..3] in room-layout.ts, hier aber
   * admin-verstellbar. Immer genau 3 aufsteigende Werte (Stufe 0 startet
   * immer bei 0 und ist nicht verstellbar).
   */
  levelThresholds: [number, number, number];
}

const DEFAULTS: RoomConfig = {
  roomEnabled:       false,
  jobsEnabled:       true,
  wageCapHours:      WAGE_CAP_HOURS_DEFAULT,
  wageMultiplierPct: 100,
  hireLockHours:     6,
  levelThresholds:   [ROOM_LEVEL_THRESHOLDS[1], ROOM_LEVEL_THRESHOLDS[2], ROOM_LEVEL_THRESHOLDS[3]],
};

const KEYS = {
  roomEnabled:       "room_enabled",
  jobsEnabled:       "room_jobs_enabled",
  wageCapHours:      "room_wage_cap_hours",
  wageMultiplierPct: "room_wage_multiplier_pct",
  hireLockHours:     "room_hire_lock_hours",
  levelThresholds:   "room_level_thresholds",
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
  const thresholds = (): [number, number, number] => {
    const raw = map.get(KEYS.levelThresholds);
    if (!raw) return DEFAULTS.levelThresholds;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 3 && parsed.every(n => Number.isFinite(n))) {
        return parsed as [number, number, number];
      }
    } catch { /* fällt auf Default zurück */ }
    return DEFAULTS.levelThresholds;
  };

  return {
    roomEnabled:       bool(KEYS.roomEnabled, DEFAULTS.roomEnabled),
    jobsEnabled:       bool(KEYS.jobsEnabled, DEFAULTS.jobsEnabled),
    wageCapHours:      num(KEYS.wageCapHours, DEFAULTS.wageCapHours),
    wageMultiplierPct: num(KEYS.wageMultiplierPct, DEFAULTS.wageMultiplierPct),
    hireLockHours:     num(KEYS.hireLockHours, DEFAULTS.hireLockHours),
    levelThresholds:   thresholds(),
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
    if (value === undefined) continue;
    // levelThresholds ist ein Array — als JSON statt über String() serialisieren,
    // sonst landet nur "a,b,c" (Array.toString()) in der Spalte.
    entries.push([KEYS[field], field === "levelThresholds" ? JSON.stringify(value) : String(value)]);
  }

  await Promise.all(entries.map(([key, value]) =>
    prisma.botConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
  ));
}

// ── Preis-Overrides ──────────────────────────────────────────────────────────
// Der Katalog selbst (ROOM_ITEMS in room-items.ts) bleibt bewusst reiner Code
// ohne Prisma-Import (Client-Komponenten importieren ihn direkt) — Admin-
// Preisanpassungen liegen deshalb als separate Overlay-Schicht in EINER
// BotConfig-Zeile (JSON-Objekt itemKey -> Preis), statt den Katalog selbst
// in die Datenbank zu verschieben. `getRoomItemsWithPrices()` liefert den
// Katalog mit bereits angewendeten Overrides — das ist die einzige Stelle,
// die Shop-Anzeige und Kauf-Prüfung (purchaseRoomItem) benutzen sollten,
// nicht mehr ROOM_ITEMS direkt, sobald der Preis relevant ist.
const PRICE_OVERRIDES_KEY = "room_price_overrides";

export async function getPriceOverrides(): Promise<Record<string, number>> {
  const row = await prisma.botConfig.findUnique({ where: { key: PRICE_OVERRIDES_KEY } }).catch(() => null);
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = Math.round(v);
      }
      return out;
    }
  } catch { /* fällt auf leer zurück */ }
  return {};
}

/**
 * Patcht einzelne Preise — `null` als Wert setzt ein Item wieder auf seinen
 * Katalog-Grundpreis zurück (löscht den Override), statt ihn auf 0 zu setzen.
 * Nur bekannte Item-Keys werden übernommen, damit kein Tippfehler im Admin-
 * Panel eine Karteileiche in der Overrides-Zeile hinterlässt.
 */
export async function updatePriceOverrides(patch: Record<string, number | null>): Promise<Record<string, number>> {
  const known = new Set(ROOM_ITEMS.map(i => i.key));
  const current = await getPriceOverrides();
  for (const [key, value] of Object.entries(patch)) {
    if (!known.has(key)) continue;
    if (value === null) delete current[key];
    else if (Number.isFinite(value) && value >= 0) current[key] = Math.round(value);
  }
  await prisma.botConfig.upsert({
    where:  { key: PRICE_OVERRIDES_KEY },
    create: { key: PRICE_OVERRIDES_KEY, value: JSON.stringify(current) },
    update: { value: JSON.stringify(current) },
  });
  return current;
}

/** ROOM_ITEMS mit angewendeten Admin-Preis-Overrides — für Shop-Anzeige und Kaufprüfung. */
export function applyPriceOverrides(items: readonly RoomItemDef[], overrides: Record<string, number>): RoomItemDef[] {
  return items.map(item => (overrides[item.key] !== undefined ? { ...item, price: overrides[item.key] } : item));
}

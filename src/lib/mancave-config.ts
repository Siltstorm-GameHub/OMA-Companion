import { prisma } from "./prisma";
import type { MancaveItemDef } from "./mancave-items";

/**
 * Rollout-Schalter + Admin-einstellbare Wirtschaft der "Mancave" (immersive
 * Profilseite, Ego-Perspektive Desktop / App-Dashboard Mobile). Gleiches
 * Muster wie das (inzwischen entfernte) room-config.ts: einzelne Werte in
 * der BotConfig-Tabelle, Preisliste als EIN JSON-Blob (siehe
 * `mancave_price_overrides` unten) statt 36+ einzelner Zeilen — der
 * Katalog selbst (mancave-items.ts) bleibt reiner Code ohne Prisma-Zugriff.
 */
export interface MancaveConfig {
  /** false = nur Admins sehen die Mancave (Standard beim ersten Rollout). */
  mancaveEnabled: boolean;
  /**
   * Testphase: Upgrades kosten nichts (`nextUpgradeCost` gibt 0 zurück) und
   * Stufen lassen sich wieder zurückstufen (`downgradeMancaveItem`, sonst
   * gesperrt). War vorher MANCAVE_DEV_FREE_MODE als fester Code-Schalter,
   * jetzt hier admin-einstellbar.
   */
  devFreeMode: boolean;
  /**
   * Admin-Preisüberschreibung je Slot, gleiche Form wie `MancaveItemDef.costs`
   * (Index 0 = Stufe 0→1 … Index 3 = Stufe 3→4). Fehlt ein Slot hier, gilt
   * der Katalog-Grundpreis aus mancave-items.ts.
   */
  priceOverrides: Record<string, [number, number, number, number]>;
}

const DEFAULTS: MancaveConfig = { mancaveEnabled: false, devFreeMode: true, priceOverrides: {} };
const KEY_ENABLED = "mancave_enabled";
const KEY_DEV_FREE = "mancave_dev_free_mode";
const KEY_PRICES = "mancave_price_overrides";

export async function getMancaveConfig(): Promise<MancaveConfig> {
  const rows = await prisma.botConfig.findMany({
    where: { key: { in: [KEY_ENABLED, KEY_DEV_FREE, KEY_PRICES] } },
  }).catch(() => []);
  const map = new Map(rows.map(r => [r.key, r.value]));

  let priceOverrides: MancaveConfig["priceOverrides"] = {};
  const raw = map.get(KEY_PRICES);
  if (raw) {
    try { priceOverrides = JSON.parse(raw); } catch { priceOverrides = {}; }
  }

  return {
    mancaveEnabled: map.has(KEY_ENABLED) ? map.get(KEY_ENABLED) === "true" : DEFAULTS.mancaveEnabled,
    devFreeMode:    map.has(KEY_DEV_FREE) ? map.get(KEY_DEV_FREE) === "true" : DEFAULTS.devFreeMode,
    priceOverrides,
  };
}

/** Darf dieser User die Mancave sehen (Seite + Nav-Eintrag)? */
export function mancaveVisibleFor(cfg: MancaveConfig, role: string | null | undefined): boolean {
  return cfg.mancaveEnabled || role === "admin";
}

export async function setMancaveEnabled(enabled: boolean): Promise<void> {
  await prisma.botConfig.upsert({
    where:  { key: KEY_ENABLED },
    create: { key: KEY_ENABLED, value: String(enabled) },
    update: { value: String(enabled) },
  });
}

export async function setMancaveDevFreeMode(enabled: boolean): Promise<void> {
  await prisma.botConfig.upsert({
    where:  { key: KEY_DEV_FREE },
    create: { key: KEY_DEV_FREE, value: String(enabled) },
    update: { value: String(enabled) },
  });
}

/** Setzt/löscht die Preis-Überschreibung eines einzelnen Slots (null = zurück auf Katalogpreis). */
export async function setMancavePriceOverride(
  itemKey: string, costs: [number, number, number, number] | null,
): Promise<MancaveConfig["priceOverrides"]> {
  const cfg = await getMancaveConfig();
  const next = { ...cfg.priceOverrides };
  if (costs) next[itemKey] = costs; else delete next[itemKey];

  await prisma.botConfig.upsert({
    where:  { key: KEY_PRICES },
    create: { key: KEY_PRICES, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

/** Effektive Kosten-Tabelle eines Slots — Admin-Override, sonst Katalog-Default. */
export function effectiveCosts(def: MancaveItemDef, cfg: MancaveConfig): [number, number, number, number] {
  return cfg.priceOverrides[def.key] ?? def.costs;
}

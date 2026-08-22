import { prisma } from "./prisma";

/**
 * Rollout-Schalter der "Mancave" (immersive Profilseite, Ego-Perspektive
 * Desktop / App-Dashboard Mobile). Gleiches Muster wie room-config.ts:
 * ein einzelner Wert in der BotConfig-Tabelle, Default aus — solange er aus
 * ist, sehen nur Admins das Feature (Seite selbst + Nav-Eintrag).
 */
export interface MancaveConfig {
  /** false = nur Admins sehen die Mancave (Standard beim ersten Rollout). */
  mancaveEnabled: boolean;
}

const DEFAULTS: MancaveConfig = { mancaveEnabled: false };
const KEY = "mancave_enabled";

export async function getMancaveConfig(): Promise<MancaveConfig> {
  const row = await prisma.botConfig.findUnique({ where: { key: KEY } }).catch(() => null);
  return { mancaveEnabled: row ? row.value === "true" : DEFAULTS.mancaveEnabled };
}

/** Darf dieser User die Mancave sehen (Seite + Nav-Eintrag)? */
export function mancaveVisibleFor(cfg: MancaveConfig, role: string | null | undefined): boolean {
  return cfg.mancaveEnabled || role === "admin";
}

export async function setMancaveEnabled(enabled: boolean): Promise<void> {
  await prisma.botConfig.upsert({
    where:  { key: KEY },
    create: { key: KEY, value: String(enabled) },
    update: { value: String(enabled) },
  });
}

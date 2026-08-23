import { prisma } from "./prisma";
import { JOBS, applyJobOverrides, type JobDef, type JobOverride } from "./jobs";

/**
 * Admin-einstellbare Job-Werte (Lohn/h + ab welcher Mancave-Stufe ein Job
 * verfügbar ist) — EIN JSON-Blob in der BotConfig-Tabelle statt einer
 * eigenen Zeile je Job×Feld, gleiches Muster wie mancave_price_overrides
 * in mancave-config.ts. jobs.ts selbst bleibt reiner Code ohne Prisma.
 */
const KEY = "mancave_job_overrides";

export async function getJobOverrides(): Promise<Record<string, JobOverride>> {
  const row = await prisma.botConfig.findUnique({ where: { key: KEY } }).catch(() => null);
  if (!row) return {};
  try { return JSON.parse(row.value); } catch { return {}; }
}

/** Setzt/löscht den Override eines einzelnen Jobs (leeres Objekt = zurück auf Katalogwerte). */
export async function setJobOverride(jobKey: string, patch: JobOverride | null): Promise<Record<string, JobOverride>> {
  const overrides = await getJobOverrides();
  const next = { ...overrides };
  if (patch && (patch.coinsPerHour !== undefined || patch.minRoomTier !== undefined)) {
    next[jobKey] = { ...next[jobKey], ...patch };
  } else {
    delete next[jobKey];
  }

  await prisma.botConfig.upsert({
    where:  { key: KEY },
    create: { key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

/** Katalog mit angewendeten Admin-Overrides — das, was Server UND Client tatsächlich verwenden sollen. */
export async function getEffectiveJobs(): Promise<JobDef[]> {
  const overrides = await getJobOverrides();
  return applyJobOverrides(JOBS, overrides);
}

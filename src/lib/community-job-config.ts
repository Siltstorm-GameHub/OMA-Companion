import { prisma } from "./prisma";
import { COMMUNITY_JOBS, type CommunityJobDef } from "./community-jobs";

/**
 * Admin-einstellbare Community-Job-Werte — EIN JSON-Blob in der BotConfig-Tabelle
 * statt eigener Tabellen für Slots/Gehaltsstufen/Bonus-Einstellungen, gleiches
 * Muster wie mancave_job_overrides in job-config.ts. Der Job-Katalog selbst
 * (community-jobs.ts) bleibt reiner Code ohne Prisma.
 */
const SLOTS_KEY = "community_job_slot_overrides";
const TIERS_KEY = "community_job_payout_tiers";
const BONUS_KEY = "community_job_vote_bonus_config";
const CHANNELS_KEY = "community_job_announcement_channels";
const TEST_MODE_KEY = "community_job_admin_test_mode";

export interface PayoutTier {
  label: string; // z.B. "Herausragend"
  minScore: number; // Schwelle, ab der diese Stufe gilt (0 = "Schwach"/Basisstufe)
  coinsAwarded: number;
}

export interface VoteBonusTier {
  label: string; // z.B. "Sehr aktiv"
  minVotes: number; // ab so vielen abgegebenen Bewertungen diese Woche gilt diese Stufe
  multiplier: number; // z.B. 1.4 — darf auch unter 1 liegen (Abzug bei Nicht-Mitmachen)
}

/**
 * Default-Stufen: 0 Bewertungen ist bewusst ein Malus (0.8×) statt neutral,
 * oberste Stufe deckelt bei 2× — siehe Plan-Ergänzung "Aktivitäts-Bonus".
 */
const DEFAULT_VOTE_BONUS_TIERS: VoteBonusTier[] = [
  { label: "Keine Bewertungen", minVotes: 0, multiplier: 0.8 },
  { label: "Wenig aktiv", minVotes: 1, multiplier: 1.0 },
  { label: "Aktiv", minVotes: 3, multiplier: 1.3 },
  { label: "Sehr aktiv", minVotes: 5, multiplier: 1.6 },
  { label: "Vorbild", minVotes: 8, multiplier: 2.0 },
];

/** Sinnvolle Default-Gehaltsstufen je Job — admin-überschreibbar. */
const DEFAULT_TIERS: Record<string, PayoutTier[]> = {
  journalist: [
    { label: "Schwach", minScore: 1, coinsAwarded: 40 },
    { label: "Gut", minScore: 10, coinsAwarded: 90 },
    { label: "Herausragend", minScore: 25, coinsAwarded: 180 },
  ],
  fotograf: [
    { label: "Schwach", minScore: 1, coinsAwarded: 40 },
    { label: "Gut", minScore: 15, coinsAwarded: 90 },
    { label: "Herausragend", minScore: 35, coinsAwarded: 180 },
  ],
  marketing_manager: [
    { label: "Schwach", minScore: 1, coinsAwarded: 40 },
    { label: "Gut", minScore: 10, coinsAwarded: 90 },
    { label: "Herausragend", minScore: 25, coinsAwarded: 180 },
  ],
  coach: [
    { label: "Schwach", minScore: 1, coinsAwarded: 40 },
    { label: "Gut", minScore: 8, coinsAwarded: 90 },
    { label: "Herausragend", minScore: 20, coinsAwarded: 180 },
  ],
  visionaer: [
    { label: "Schwach", minScore: 1, coinsAwarded: 40 },
    { label: "Gut", minScore: 10, coinsAwarded: 90 },
    { label: "Herausragend", minScore: 25, coinsAwarded: 180 },
  ],
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.botConfig.findUnique({ where: { key } }).catch(() => null);
  if (!row) return fallback;
  try { return { ...fallback, ...JSON.parse(row.value) }; } catch { return fallback; }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

// ── Slots ────────────────────────────────────────────────────────────────────

export async function getSlotOverrides(): Promise<Record<string, number>> {
  return readJson<Record<string, number>>(SLOTS_KEY, {});
}

export async function setSlotOverride(jobKey: string, maxSlots: number | null): Promise<void> {
  const overrides = await getSlotOverrides();
  const next = { ...overrides };
  if (maxSlots == null) delete next[jobKey];
  else next[jobKey] = maxSlots;
  await writeJson(SLOTS_KEY, next);
}

export async function getEffectiveCommunityJobs(): Promise<CommunityJobDef[]> {
  const overrides = await getSlotOverrides();
  return COMMUNITY_JOBS.map(job => ({
    ...job,
    maxSlots: overrides[job.key] ?? job.maxSlots,
  }));
}

export async function getMaxSlots(jobKey: string): Promise<number> {
  const overrides = await getSlotOverrides();
  if (overrides[jobKey] != null) return overrides[jobKey];
  return COMMUNITY_JOBS.find(j => j.key === jobKey)?.maxSlots ?? 0;
}

// ── Gehaltsstufen ────────────────────────────────────────────────────────────

export async function getPayoutTiers(jobKey: string): Promise<PayoutTier[]> {
  const all = await readJson<Record<string, PayoutTier[]>>(TIERS_KEY, DEFAULT_TIERS);
  return all[jobKey] ?? DEFAULT_TIERS[jobKey] ?? [];
}

export async function setPayoutTiers(jobKey: string, tiers: PayoutTier[]): Promise<void> {
  const all = await readJson<Record<string, PayoutTier[]>>(TIERS_KEY, DEFAULT_TIERS);
  const next = { ...all, [jobKey]: tiers };
  await writeJson(TIERS_KEY, next);
}

/** Höchste Stufe, deren minScore der Score erreicht — oder null, wenn score <= 0 (keine Bewertung erhalten). */
export function resolveTier(tiers: PayoutTier[], score: number): PayoutTier | null {
  if (score <= 0) return null;
  const eligible = tiers.filter(t => score >= t.minScore).sort((a, b) => b.minScore - a.minScore);
  return eligible[0] ?? null;
}

// ── Aktivitäts-Bonus (Mitbewerten) ───────────────────────────────────────────
// Gestaffelt wie die Gehaltsstufen, jobübergreifend (Bewerten zählt überall
// gleich) — bewusst OHNE readJson()-Merge, da hier eine komplette Liste statt
// eines partiell überschreibbaren Objekts gespeichert wird (ein Array-Spread
// über {...fallback, ...parsed} würde in ein Objekt mit Zahlen-Keys entarten).

export async function getVoteBonusTiers(): Promise<VoteBonusTier[]> {
  const row = await prisma.botConfig.findUnique({ where: { key: BONUS_KEY } }).catch(() => null);
  if (!row) return DEFAULT_VOTE_BONUS_TIERS;
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : DEFAULT_VOTE_BONUS_TIERS;
  } catch {
    return DEFAULT_VOTE_BONUS_TIERS;
  }
}

export async function setVoteBonusTiers(tiers: VoteBonusTier[]): Promise<void> {
  await writeJson(BONUS_KEY, tiers);
}

/** Höchste Stufe, deren minVotes die abgegebene Anzahl erreicht — Stufe "0 Bewertungen" greift immer als Fallback. */
export function resolveVoteBonusMultiplier(tiers: VoteBonusTier[], ownVoteCount: number): number {
  const eligible = tiers.filter(t => ownVoteCount >= t.minVotes).sort((a, b) => b.minVotes - a.minVotes);
  return eligible[0]?.multiplier ?? 1;
}

// ── Discord-Ankündigungskanal je Job ─────────────────────────────────────────
// Admin entscheidet pro Job, in welchem Discord-Kanal neue Beiträge angekündigt
// werden (Reports/Assets/Marketing-Posts — Coach/Visionär kündigen ohnehin nicht
// an, siehe Discord-Anbindung). Fällt ohne Override auf DISCORD_COMMUNITY_JOBS_CHANNEL_ID zurück.

export async function getAnnouncementChannelOverrides(): Promise<Record<string, string>> {
  return readJson<Record<string, string>>(CHANNELS_KEY, {});
}

export async function setAnnouncementChannel(jobKey: string, channelId: string | null): Promise<void> {
  const overrides = await getAnnouncementChannelOverrides();
  const next = { ...overrides };
  if (channelId == null || channelId === "") delete next[jobKey];
  else next[jobKey] = channelId;
  await writeJson(CHANNELS_KEY, next);
}

export async function getAnnouncementChannel(jobKey: string): Promise<string | null> {
  const overrides = await getAnnouncementChannelOverrides();
  return overrides[jobKey] ?? process.env.DISCORD_COMMUNITY_JOBS_CHANNEL_ID ?? null;
}

// ── Admin-Testmodus ──────────────────────────────────────────────────────────
// Global ein-/ausschaltbar im Admin-Bereich. Gilt NUR für User mit Admin-Rolle
// (per-Route-Check, nicht hier) — erlaubt ihnen, Community-Jobs ohne Sperrfrist
// nach Entzug und ohne Rücksicht auf freie Slots sofort zu wechseln, um alle
// Jobs durchzutesten.

export async function getTestModeEnabled(): Promise<boolean> {
  const row = await prisma.botConfig.findUnique({ where: { key: TEST_MODE_KEY } }).catch(() => null);
  return row?.value === "true";
}

export async function setTestModeEnabled(enabled: boolean): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key: TEST_MODE_KEY },
    create: { key: TEST_MODE_KEY, value: String(enabled) },
    update: { value: String(enabled) },
  });
}

// ============================================
// OMA Quest — Quest-Log: laufende, verfügbare und abgeschlossene Quests, Verfolgen, Annehmen, Abbrechen
// ============================================
// Eine Quest gilt als angenommen, sobald eine DndQuestProgress-Zeile existiert (Welt-Quests: nach dem
// Angebots-Dialog am NPC; Aktivitäts-Quests: über „Annehmen" im Log). Mehrere Quests laufen gleichzeitig,
// auch mehrere an derselben Location; verfolgte Quests zeigt das Spiel-HUD.
//
// Story: eine Welt-Quest ohne `authorId` gehört zur Hauptstory (feste Locations, von Admins verwaltet); mit
// `authorId` ist sie eine Nebenquest einer Community-Location. Mehrere Quests desselben Autors mit demselben
// `questline`-Namen (auch über mehrere Locations hinweg) bilden eine Questreihe, `part` ist ihre Reihenfolge.

import { activeSeasonKeys } from "./season-server";
import { seasonOfQuest } from "./season-events";
import { ensureDailyBounties, ensureDndQuestsSeeded, prereqMet } from "./quests";
import { getWorld, WORLD_SLUGS } from "../te-map/worlds";
import { prisma } from "../prisma";

export interface LogStep { kind: "talk" | "visit" | "enter" | "goal"; text: string; location?: string; locationName?: string; goalCurrent?: number; goalTarget?: number }
export interface LogQuest {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "world" | "activity";
  objectiveType: string;
  current: number;
  target: number;
  xpReward: number;
  coinReward: number;
  tracked: boolean;
  home: { slug: string; name: string } | null;
  steps: LogStep[] | null;
  /** Tagesauftrag aus der gemeinsamen Liste (setzt sich täglich zurück) */
  bounty: boolean;
  bountyCadence: "daily" | "monthly" | null;
  /** Hauptstory = null; sonst der Autor der Community-Quest */
  author: string | null;
  questline: string | null;
  part: number | null;
  /** Nur "verfügbar": eine Voraussetzungs-Quest fehlt noch */
  locked: boolean;
}
export interface TrackerItem {
  slug: string;
  title: string;
  objective: string;
  /** Ort des aktuellen Ziels (Name) */
  where: string | null;
  whereSlug: string | null;
  progress: string;
}

/** Charakter des eingeloggten Users (nur mit fertigem OMA-Quest-Charakter). */
export async function getMyDndCard(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  if (!user?.discordId) return null;
  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  return card?.dndCreatedAt ? card : null;
}

type QuestRow = {
  id: string; slug: string; title: string; description: string; objectiveType: string; targetCount: number; xpReward: number; coinReward: number; steps: unknown;
  location: { slug: string; name: string } | null; bounty: boolean; bountyCadence: string | null; authorName: string | null; questline: string | null; part: number | null; requires: string | null;
};

function toLogQuest(q: QuestRow, current: number, tracked: boolean, names: Map<string, string>, goalProgress: number, locked: boolean): LogQuest {
  const raw = Array.isArray(q.steps) ? (q.steps as { kind?: string; text?: string; location?: string; targetCount?: number }[]) : null;
  return {
    id: q.id, slug: q.slug, title: q.title, description: q.description,
    kind: q.objectiveType === "WORLD_STEP" ? "world" : "activity",
    objectiveType: q.objectiveType,
    current, target: q.targetCount, xpReward: q.xpReward, coinReward: q.coinReward, tracked,
    home: q.location,
    bounty: q.bounty, bountyCadence: q.bountyCadence === "daily" || q.bountyCadence === "monthly" ? q.bountyCadence : null, author: q.authorName, questline: q.questline, part: q.part, locked,
    steps: raw
      ? raw.map((s, i) => ({
          kind: s.kind === "visit" ? "visit" : s.kind === "enter" ? "enter" : s.kind === "goal" ? "goal" : "talk",
          text: String(s.text ?? ""),
          location: s.location,
          locationName: s.location ? names.get(s.location) : undefined,
          ...(s.kind === "goal" ? { goalCurrent: i === current ? goalProgress : (i < current ? (s.targetCount ?? 1) : 0), goalTarget: s.targetCount ?? 1 } : {}),
        }))
      : null,
  };
}

export async function getQuestLog(cardId: string): Promise<{ active: LogQuest[]; available: LogQuest[]; completed: LogQuest[] }> {
  await ensureDailyBounties();
  const [progress, quests, locations] = await Promise.all([
    prisma.dndQuestProgress.findMany({ where: { cardId } }),
    prisma.dndQuest.findMany({ orderBy: [{ objectiveType: "asc" }, { title: "asc" }], include: { location: { select: { slug: true, name: true } } } }),
    prisma.dndLocation.findMany({ select: { slug: true, name: true } }),
  ]);
  const names = new Map(locations.map((l) => [l.slug, l.name]));
  const running = await activeSeasonKeys();
  const byQuest = new Map(progress.map((p) => [p.questId, p]));
  const knownSlugs = new Set(quests.map((q) => q.slug));
  const completedSlugs = new Set(quests.filter((q) => byQuest.get(q.id)?.completed).map((q) => q.slug));
  const out = { active: [] as LogQuest[], available: [] as LogQuest[], completed: [] as LogQuest[] };
  for (const q of quests) {
    const p = byQuest.get(q.id);
    if (!p) {
      // Event-Quests stehen nur zur Annahme, solange ihr Event läuft
      const ev = seasonOfQuest(q.slug);
      if (ev && !running.includes(ev)) continue;
      // Welt-Quests nimmt man im Spiel am NPC an; nur Aktivitäts-/Bounty-Quests stehen zur Annahme bereit
      if (q.objectiveType !== "WORLD_STEP") {
        const locked = !!q.requires && knownSlugs.has(q.requires) && !completedSlugs.has(q.requires);
        out.available.push(toLogQuest(q, 0, false, names, 0, locked));
      }
      continue;
    }
    (p.completed ? out.completed : out.active).push(toLogQuest(q, p.current, p.tracked, names, p.goalProgress, false));
  }
  return out;
}

export interface ChapterProgress { slug: string; title: string; total: number; done: number; started: boolean; complete: boolean }

/** Hauptstory-Fortschritt: je feste Location, wie viele ihrer Hauptstory-Quests (kein Autor = Hauptstory) der
 *  Charakter abgeschlossen hat. Grundlage für die kompakte „Kapitel X von 10"-Anzeige im Quest-Log. */
export async function getStoryProgress(cardId: string): Promise<{ chapters: ChapterProgress[]; completedChapters: number; totalChapters: number }> {
  await ensureDndQuestsSeeded();
  const quests = await prisma.dndQuest.findMany({
    where: { objectiveType: "WORLD_STEP", authorId: null, location: { slug: { in: WORLD_SLUGS } } },
    select: { id: true, location: { select: { slug: true } } },
  });
  const progress = await prisma.dndQuestProgress.findMany({
    where: { cardId, questId: { in: quests.map((q) => q.id) } },
    select: { questId: true, completed: true },
  });
  const doneIds = new Set(progress.filter((p) => p.completed).map((p) => p.questId));
  const startedIds = new Set(progress.map((p) => p.questId));
  const bySlug = new Map<string, { total: number; done: number; started: boolean }>();
  for (const q of quests) {
    const slug = q.location!.slug;
    const row = bySlug.get(slug) ?? { total: 0, done: 0, started: false };
    row.total++;
    if (doneIds.has(q.id)) row.done++;
    if (startedIds.has(q.id)) row.started = true;
    bySlug.set(slug, row);
  }
  const chapters: ChapterProgress[] = WORLD_SLUGS.map((slug) => {
    const row = bySlug.get(slug) ?? { total: 0, done: 0, started: false };
    return { slug, title: getWorld(slug)?.title ?? slug, total: row.total, done: row.done, started: row.started, complete: row.total > 0 && row.done === row.total };
  });
  return { chapters, completedChapters: chapters.filter((c) => c.complete).length, totalChapters: chapters.length };
}

/** Verfolgte, laufende Quests mit ihrem aktuellen Ziel (für das Spiel-HUD). */
export async function getTracker(cardId: string): Promise<TrackerItem[]> {
  const { active } = await getQuestLog(cardId);
  return active.filter((q) => q.tracked).map(trackerItemOf);
}

export function trackerItemOf(q: LogQuest): TrackerItem {
  const step = q.steps?.[q.current];
  if (q.kind === "world" && step) {
    const visit = step.kind === "visit" && step.location;
    const goal = step.kind === "goal" ? ` (${step.goalCurrent ?? 0}/${step.goalTarget ?? 1})` : "";
    return {
      slug: q.slug, title: q.title, objective: step.text + goal,
      where: visit ? (step.locationName ?? step.location ?? null) : (q.home?.name ?? null),
      whereSlug: visit ? step.location ?? null : (q.home?.slug ?? null),
      progress: `${q.current}/${q.target}`,
    };
  }
  return { slug: q.slug, title: q.title, objective: q.description, where: null, whereSlug: null, progress: `${q.current}/${q.target}` };
}

export async function acceptActivityQuest(cardId: string, questId: string): Promise<{ ok: true } | { error: string }> {
  const q = await prisma.dndQuest.findUnique({ where: { id: questId } });
  if (!q) return { error: "Quest nicht gefunden" };
  if (q.objectiveType === "WORLD_STEP") return { error: "Diese Quest nimmst du im Spiel bei ihrem Auftraggeber an." };
  if (!(await prereqMet(cardId, q.requires))) return { error: "Dafür brauchst du erst eine andere Quest." };
  const existing = await prisma.dndQuestProgress.findUnique({ where: { cardId_questId: { cardId, questId } } });
  if (existing) return { error: existing.completed ? "Schon abgeschlossen." : "Schon angenommen." };
  await prisma.dndQuestProgress.create({ data: { cardId, questId, current: 0 } });
  return { ok: true };
}

export async function setQuestTracked(cardId: string, questId: string, tracked: boolean): Promise<{ ok: true } | { error: string }> {
  const r = await prisma.dndQuestProgress.updateMany({ where: { cardId, questId, completed: false }, data: { tracked } });
  return r.count ? { ok: true } : { error: "Diese Quest läuft nicht." };
}

/** Quest abbrechen: der Fortschritt verfällt, sie lässt sich später neu annehmen. */
export async function abandonQuest(cardId: string, questId: string): Promise<{ ok: true } | { error: string }> {
  const r = await prisma.dndQuestProgress.deleteMany({ where: { cardId, questId, completed: false } });
  return r.count ? { ok: true } : { error: "Diese Quest läuft nicht." };
}

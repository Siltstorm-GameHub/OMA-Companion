// ============================================
// OMA Quest — Quest-Log: laufende, verfügbare und abgeschlossene Quests, Verfolgen, Annehmen, Abbrechen
// ============================================
// Eine Quest gilt als angenommen, sobald eine DndQuestProgress-Zeile existiert (Welt-Quests: nach dem
// Angebots-Dialog am NPC; Aktivitäts-Quests: über „Annehmen" im Log). Mehrere Quests laufen gleichzeitig,
// auch mehrere an derselben Location; verfolgte Quests zeigt das Spiel-HUD.

import { prisma } from "../prisma";

export interface LogStep { kind: "talk" | "visit" | "enter"; text: string; location?: string; locationName?: string }
export interface LogQuest {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "world" | "activity";
  current: number;
  target: number;
  xpReward: number;
  coinReward: number;
  tracked: boolean;
  home: { slug: string; name: string } | null;
  steps: LogStep[] | null;
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

type QuestRow = { id: string; slug: string; title: string; description: string; objectiveType: string; targetCount: number; xpReward: number; coinReward: number; steps: unknown; location: { slug: string; name: string } | null };

function toLogQuest(q: QuestRow, current: number, tracked: boolean, names: Map<string, string>): LogQuest {
  const raw = Array.isArray(q.steps) ? (q.steps as { kind?: string; text?: string; location?: string }[]) : null;
  return {
    id: q.id, slug: q.slug, title: q.title, description: q.description,
    kind: q.objectiveType === "WORLD_STEP" ? "world" : "activity",
    current, target: q.targetCount, xpReward: q.xpReward, coinReward: q.coinReward, tracked,
    home: q.location,
    steps: raw
      ? raw.map((s) => ({
          kind: s.kind === "visit" ? "visit" : s.kind === "enter" ? "enter" : "talk",
          text: String(s.text ?? ""),
          location: s.location,
          locationName: s.location ? names.get(s.location) : undefined,
        }))
      : null,
  };
}

export async function getQuestLog(cardId: string): Promise<{ active: LogQuest[]; available: LogQuest[]; completed: LogQuest[] }> {
  const [progress, quests, locations] = await Promise.all([
    prisma.dndQuestProgress.findMany({ where: { cardId } }),
    prisma.dndQuest.findMany({ orderBy: [{ objectiveType: "asc" }, { title: "asc" }], include: { location: { select: { slug: true, name: true } } } }),
    prisma.dndLocation.findMany({ select: { slug: true, name: true } }),
  ]);
  const names = new Map(locations.map((l) => [l.slug, l.name]));
  const byQuest = new Map(progress.map((p) => [p.questId, p]));
  const out = { active: [] as LogQuest[], available: [] as LogQuest[], completed: [] as LogQuest[] };
  for (const q of quests) {
    const p = byQuest.get(q.id);
    if (!p) {
      // Welt-Quests nimmt man im Spiel am NPC an; nur Aktivitäts-Quests stehen zur Annahme bereit
      if (q.objectiveType !== "WORLD_STEP") out.available.push(toLogQuest(q, 0, false, names));
      continue;
    }
    (p.completed ? out.completed : out.active).push(toLogQuest(q, p.current, p.tracked, names));
  }
  return out;
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
    return {
      slug: q.slug, title: q.title, objective: step.text,
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

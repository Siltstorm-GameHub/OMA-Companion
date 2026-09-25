// ============================================
// OMA Quest — Welten aus dem Editor (Server): Berechtigung, Veröffentlichung, Admin-Verwaltung
// ============================================
// Wer einen aktiven Community-Job hat (oder Admin ist), darf im Editor Locations bauen und sich dafür ein
// leeres Landfeld der Hex-Weltkarte aussuchen. Fertige Welten gehen zur Prüfung an einen Admin; mit der
// Veröffentlichen entsteht die DndLocation samt DndQuest — ohne Prüfung; Admins werden per In-App-Nachricht
// informiert (neue Location, Änderungen, Löschungen). Admins dürfen ALLES bearbeiten und löschen — auch die
// im Code vordefinierten Locations: Beim ersten Bearbeiten wird die feste Welt als Dokument in die Datenbank
// übernommen (Zeile mit ihrem Slug) und ersetzt ab dann die Code-Fassung. Gelöschte Code-Inhalte merkt sich
// DndRemovedContent, damit die Seed-Funktionen sie nicht wieder anlegen.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotificationForUsers } from "@/lib/notifications";
import { logChronicle } from "./chronicle";
import { hasMinRole } from "@/lib/roles";
import { docQuestSlug, docToWorld, sanitizeCustomWorldDoc, validateForSubmit, worldToDoc, type CustomWorldDoc } from "@/lib/te-map/custom-world";
import { getWorld, WORLD_SLUGS } from "@/lib/te-map/worlds";
import { worldQuestsOf } from "@/lib/te-map/types";
import type { WorldDef } from "@/lib/te-map/types";
import { WORLD_COLS, WORLD_ROWS, terrainAt } from "./hex/world";
import { DND_LOCATIONS, START_LOCATION_SLUG } from "./locations";
import { DND_QUESTS } from "./quests-catalog";

export const MAX_WORLDS_PER_AUTHOR = 3;

export type BuilderAccess = { allowed: true; isAdmin: boolean } | { allowed: false };

export async function getBuilderAccess(userId: string): Promise<BuilderAccess> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { allowed: false };
  if (hasMinRole(user.role, "admin")) return { allowed: true, isAdmin: true };
  const job = await prisma.communityJobMember.findFirst({ where: { userId, status: { in: ["ACTIVE", "WARNED"] } }, select: { id: true } });
  return job ? { allowed: true, isAdmin: false } : { allowed: false };
}

/** Slug der ersten ("main") Quest einer Welt: feste Welten behalten ihren, Editor-Welten "welt-<slug>". */
export const questSlugFor = (slug: string): string => getWorld(slug)?.quest.slug ?? `welt-${slug}`;

/** Alle Quest-Slugs einer festen Welt (für Löschen/Wiederherstellen). */
const fixedQuestSlugs = (slug: string): string[] => { const w = getWorld(slug); return w ? worldQuestsOf(w).map((q) => q.slug) : [`welt-${slug}`]; };

export async function removedSlugs(kind: "LOCATION" | "QUEST"): Promise<Set<string>> {
  const rows = await prisma.dndRemovedContent.findMany({ where: { kind }, select: { slug: true } });
  return new Set(rows.map((r) => r.slug));
}

/** Veröffentlichte Editor-Welt (auch als Ersatz einer festen Welt) als spielbare Definition. */
export async function getPublishedCustomWorld(slug: string): Promise<WorldDef | null> {
  const row = await prisma.dndCustomWorld.findUnique({ where: { slug } });
  if (!row || row.status !== "PUBLISHED") return null;
  const s = sanitizeCustomWorldDoc(row.doc);
  return s.ok ? docToWorld(s.doc, slug, questSlugFor(slug)) : null;
}

/** Welt einer Location: Editor-Fassung, sonst feste Welt (außer sie wurde gelöscht). */
export async function resolveWorld(slug: string): Promise<WorldDef | undefined> {
  const custom = await getPublishedCustomWorld(slug);
  if (custom) return custom;
  const fixed = getWorld(slug);
  if (!fixed) return undefined;
  return (await removedSlugs("LOCATION")).has(slug) ? undefined : fixed;
}

// ── Hex-Felder ──────────────────────────────────────────────

export interface TakenHex { col: number; row: number; slug: string; name: string }

export async function takenHexes(): Promise<TakenHex[]> {
  const rows = await prisma.dndLocation.findMany({ select: { hexCol: true, hexRow: true, slug: true, name: true } });
  return rows.map((l) => ({ col: l.hexCol, row: l.hexRow, slug: l.slug, name: l.name }));
}

/** Fehlertext, wenn das Feld nicht als Location-Standort taugt (sonst null). `ownSlug` = die Location selbst. */
export async function checkHex(hex: { col: number; row: number }, ownSlug?: string): Promise<string | null> {
  if (!Number.isInteger(hex.col) || !Number.isInteger(hex.row) || hex.col < 0 || hex.row < 0 || hex.col >= WORLD_COLS || hex.row >= WORLD_ROWS) return "Dieses Feld liegt außerhalb der Weltkarte.";
  const t = terrainAt(hex);
  if (!t || t === "o" || t === "l" || t === "v") return "Auf Wasser oder Lava kann keine Location stehen.";
  const other = (await takenHexes()).find((l) => l.col === hex.col && l.row === hex.row && l.slug !== ownSlug);
  return other ? `Das Feld ist schon von „${other.name}“ belegt.` : null;
}

/** Freies Landfeld: nicht Ozean/Lava, nicht belegt; deterministisch aus dem Slug. */
export async function pickFreeHex(slug: string): Promise<{ col: number; row: number } | null> {
  const taken = new Set((await takenHexes()).map((l) => `${l.col},${l.row}`));
  const candidates: { col: number; row: number }[] = [];
  for (let row = 1; row < WORLD_ROWS - 1; row++) {
    for (let col = 1; col < WORLD_COLS - 1; col++) {
      const t = terrainAt({ col, row });
      if (!t || t === "o" || t === "l" || t === "v" || taken.has(`${col},${row}`)) continue;
      candidates.push({ col, row });
    }
  }
  if (!candidates.length) return null;
  let h = 2166136261;
  for (const ch of slug) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return candidates[h % candidates.length];
}

// ── Veröffentlichen ─────────────────────────────────────────

/** Besuchs-Schritte müssen auf bestehende, andere Locations zeigen (sonst hängt die Quest fest). */
export async function checkVisitTargets(doc: CustomWorldDoc, ownSlug: string): Promise<string | null> {
  const wanted = new Set(doc.quests.flatMap((q) => q.steps.flatMap((st) => (st.kind === "visit" && st.location ? [st.location] : []))));
  if (!wanted.size) return null;
  if (wanted.has(ownSlug)) return "Ein Besuchs-Schritt zeigt auf diese Location selbst — dort reicht ein Gespräch.";
  const found = new Set((await prisma.dndLocation.findMany({ where: { slug: { in: [...wanted] } }, select: { slug: true } })).map((l) => l.slug));
  const missing = [...wanted].filter((w) => !found.has(w));
  return missing.length ? `Die Location „${missing[0]}“ aus einem Besuchs-Schritt gibt es nicht (mehr).` : null;
}

/** DndLocation + DndQuest zur Editor-Welt anlegen bzw. angleichen. Rückgabe: Fehlertext oder null. */
async function syncLocationAndQuest(slug: string, doc: CustomWorldDoc, wanted: { col: number; row: number } | null): Promise<string | null> {
  const existing = await prisma.dndLocation.findUnique({ where: { slug }, select: { id: true } });
  let locationId = existing?.id;
  if (existing) {
    // Typ und Feld bleiben (Spieler stehen dort); Name/Beschreibung folgen dem Editor
    await prisma.dndLocation.update({ where: { slug }, data: { name: doc.title, description: doc.description || null } });
  } else {
    let hex = wanted && !(await checkHex(wanted, slug)) ? wanted : null;
    hex ??= await pickFreeHex(slug);
    if (!hex) return "Auf der Weltkarte ist kein freies Feld mehr.";
    const count = await prisma.dndLocation.count();
    const created = await prisma.dndLocation.create({
      data: {
        slug, name: doc.title, description: doc.description || null, hexCol: hex.col, hexRow: hex.row, order: count,
        locationType: doc.theme === "cave" ? "DUNGEON" : "SETTLEMENT",
      },
    });
    locationId = created.id;
  }
  const keep: string[] = [];
  for (const q of doc.quests) {
    const questSlug = docQuestSlug(slug, q.id, questSlugFor(slug));
    keep.push(questSlug);
    const description = q.steps.map((st) => st.text).join(" → ");
    const steps = JSON.parse(JSON.stringify(q.steps));
    await prisma.dndQuest.upsert({
      where: { slug: questSlug },
      create: { slug: questSlug, title: q.title, description, objectiveType: "WORLD_STEP", targetCount: q.steps.length, xpReward: q.xpReward, coinReward: 0, locationId, steps, adminEdited: true },
      update: { title: q.title, description, targetCount: q.steps.length, xpReward: q.xpReward, locationId, steps, adminEdited: true },
    });
  }
  // Quests, die der Autor entfernt hat, verschwinden samt Fortschritt
  const stale = await prisma.dndQuest.findMany({ where: { locationId, objectiveType: "WORLD_STEP", slug: { notIn: keep } }, select: { id: true } });
  if (stale.length) {
    await prisma.dndQuestProgress.deleteMany({ where: { questId: { in: stale.map((q) => q.id) } } });
    await prisma.dndQuest.deleteMany({ where: { id: { in: stale.map((q) => q.id) } } });
  }
  // Ein zuvor gelöschter fester Inhalt ist mit dem Neuanlegen wieder da
  await prisma.dndRemovedContent.deleteMany({ where: { OR: [{ kind: "LOCATION", slug }, { kind: "QUEST", slug: { in: keep } }] } });
  return null;
}

/** In-App-Nachricht an alle Admins außer dem Auslöser. Wiederholte Änderungen an derselben Welt innerhalb von
 *  `throttleMinutes` erzeugen nur eine Nachricht (der Editor speichert oft). */
export async function notifyAdmins(actorId: string, title: string, body: string, url: string, throttleMinutes = 0): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { role: "admin", id: { not: actorId } }, select: { id: true } });
    if (!admins.length) return;
    if (throttleMinutes > 0) {
      const recent = await prisma.inAppNotification.findFirst({
        where: { type: "admin", url, title, createdAt: { gte: new Date(Date.now() - throttleMinutes * 60_000) } },
        select: { id: true },
      });
      if (recent) return;
    }
    await createNotificationForUsers(admins.map((a) => a.id), { type: "admin", title, body, url });
  } catch {
    // Benachrichtigungen dürfen das Speichern/Veröffentlichen nie scheitern lassen
  }
}

/** Veröffentlicht eine Welt sofort (kein Freigabe-Schritt). */
export async function publishCustomWorld(id: string, reviewerId: string): Promise<{ ok: true } | { error: string }> {
  const row = await prisma.dndCustomWorld.findUnique({ where: { id } });
  if (!row) return { error: "Welt nicht gefunden" };
  const v = validateForSubmit(row.doc);
  if (!v.ok) return { error: `Die Welt ist nicht spielbar: ${v.errors[0]}` };
  const visitProblem = await checkVisitTargets(v.doc, row.slug);
  if (visitProblem) return { error: visitProblem };
  const wanted = row.hexCol != null && row.hexRow != null ? { col: row.hexCol, row: row.hexRow } : null;
  if (wanted) {
    const problem = await checkHex(wanted, row.slug);
    if (problem) return { error: `${problem} Der Autor (oder du) muss ein anderes Feld wählen.` };
  }
  const err = await syncLocationAndQuest(row.slug, v.doc, wanted);
  if (err) return { error: err };
  const loc = await prisma.dndLocation.findUnique({ where: { slug: row.slug }, select: { hexCol: true, hexRow: true } });
  if (row.status !== "PUBLISHED") await logChronicle("location", `Ein neuer Ort ist entstanden: ${v.doc.title}.`, row.slug);
  await prisma.dndCustomWorld.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: row.publishedAt ?? new Date(), reviewedById: reviewerId, reviewNote: null, hexCol: loc?.hexCol ?? null, hexRow: loc?.hexRow ?? null },
  });
  return { ok: true };
}

/** Nach einer Admin-Bearbeitung einer veröffentlichten Welt: Name/Quest in der Spielwelt nachziehen. */
export async function resyncPublishedWorld(id: string): Promise<string | null> {
  const row = await prisma.dndCustomWorld.findUnique({ where: { id } });
  if (!row || row.status !== "PUBLISHED") return null;
  const v = validateForSubmit(row.doc);
  if (!v.ok) return `Die Welt ist nicht spielbar: ${v.errors[0]}`;
  return syncLocationAndQuest(row.slug, v.doc, null);
}

// ── Admin: alles bearbeiten und löschen ─────────────────────

/** Bearbeitbare Welt für eine bestehende Location: Editor-Welten direkt, feste Welten werden übernommen. */
export async function ensureEditableWorld(slug: string, adminId: string): Promise<{ id: string } | { error: string }> {
  const existing = await prisma.dndCustomWorld.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return existing;
  const fixed = getWorld(slug);
  const loc = await prisma.dndLocation.findUnique({ where: { slug } });
  if (!fixed || !loc) return { error: "Diese Location hat keine bearbeitbare Welt." };
  const doc = worldToDoc(fixed, loc.description ?? "");
  doc.title = loc.name;
  const row = await prisma.dndCustomWorld.create({
    data: {
      slug, authorId: adminId, title: doc.title, status: "PUBLISHED", doc: JSON.parse(JSON.stringify(doc)),
      publishedAt: new Date(), reviewedById: adminId, hexCol: loc.hexCol, hexRow: loc.hexRow,
    },
  });
  return { id: row.id };
}

const isFixedLocation = (slug: string) => WORLD_SLUGS.includes(slug) || DND_LOCATIONS.some((l) => l.slug === slug);

/** Location samt Quest, Story-Verlauf und Editor-Welt löschen. Charaktere bleiben auf dem (nun freien) Feld stehen. */
export async function deleteLocation(slug: string): Promise<{ ok: true } | { error: string }> {
  if (slug === START_LOCATION_SLUG) return { error: "Der Startort kann nicht gelöscht werden (neue Charaktere beginnen dort)." };
  const loc = await prisma.dndLocation.findUnique({ where: { slug } });

  await prisma.$transaction(async (tx) => {
    if (loc) {
      // Charaktere an diesem Ort: Position auf das Feld festschreiben, Ort lösen
      await tx.card.updateMany({ where: { currentLocationId: loc.id, currentHexCol: null }, data: { currentHexCol: loc.hexCol, currentHexRow: loc.hexRow } });
      await tx.card.updateMany({ where: { currentLocationId: loc.id }, data: { currentLocationId: null } });
      // Reisende mit diesem Ziel: Reise abbrechen, zurück zum Startfeld des Pfads
      const travelers = await tx.card.findMany({ where: { travelToCol: loc.hexCol, travelToRow: loc.hexRow }, select: { id: true, travelPath: true } });
      for (const c of travelers) {
        const start = Array.isArray(c.travelPath) && Array.isArray(c.travelPath[0]) ? (c.travelPath[0] as number[]) : null;
        const at = start ? await tx.dndLocation.findFirst({ where: { hexCol: start[0], hexRow: start[1], id: { not: loc.id } }, select: { id: true } }) : null;
        await tx.card.update({
          where: { id: c.id },
          data: {
            travelToCol: null, travelToRow: null, travelPath: Prisma.DbNull, travelDepartedAt: null, travelArrivesAt: null,
            ...(start ? { currentHexCol: start[0], currentHexRow: start[1], currentLocationId: at?.id ?? null } : {}),
          },
        });
      }
      const quests = await tx.dndQuest.findMany({ where: { locationId: loc.id }, select: { id: true, slug: true } });
      if (quests.length) {
        await tx.dndQuestProgress.deleteMany({ where: { questId: { in: quests.map((q) => q.id) } } });
        await tx.dndQuest.deleteMany({ where: { id: { in: quests.map((q) => q.id) } } });
      }
      await tx.dndEventLog.deleteMany({ where: { locationId: loc.id } });
      await tx.dndStoryNode.deleteMany({ where: { locationId: loc.id } });
      await tx.dndLocation.delete({ where: { id: loc.id } });
    }
    await tx.dndCustomWorld.deleteMany({ where: { slug } });
    if (isFixedLocation(slug)) {
      await tx.dndRemovedContent.upsert({ where: { kind_slug: { kind: "LOCATION", slug } }, create: { kind: "LOCATION", slug }, update: {} });
      for (const qs of fixedQuestSlugs(slug)) {
        await tx.dndRemovedContent.upsert({ where: { kind_slug: { kind: "QUEST", slug: qs } }, create: { kind: "QUEST", slug: qs }, update: {} });
      }
    }
  });
  return { ok: true };
}

/** Aktivitäts-Quests (nicht an eine Welt gebunden) ändern. */
export async function updateActivityQuest(
  id: string,
  patch: { title?: unknown; description?: unknown; targetCount?: unknown; xpReward?: unknown; coinReward?: unknown },
): Promise<{ ok: true } | { error: string }> {
  const q = await prisma.dndQuest.findUnique({ where: { id } });
  if (!q) return { error: "Quest nicht gefunden" };
  if (q.objectiveType === "WORLD_STEP") return { error: "Diese Quest gehört zu einer Location — bearbeite sie im Editor der Location." };
  const int = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined);
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  await prisma.dndQuest.update({
    where: { id },
    data: {
      title: str(patch.title, 80), description: str(patch.description, 500),
      targetCount: int(patch.targetCount, 1, 100000), xpReward: int(patch.xpReward, 0, 1000), coinReward: int(patch.coinReward, 0, 1000),
      adminEdited: true,
    },
  });
  return { ok: true };
}

export async function deleteActivityQuest(id: string): Promise<{ ok: true } | { error: string }> {
  const q = await prisma.dndQuest.findUnique({ where: { id } });
  if (!q) return { error: "Quest nicht gefunden" };
  if (q.objectiveType === "WORLD_STEP") return { error: "Quests von Locations verschwinden mit der Location — lösche die Location." };
  await prisma.$transaction([
    prisma.dndQuestProgress.deleteMany({ where: { questId: id } }),
    prisma.dndQuest.delete({ where: { id } }),
    ...(DND_QUESTS.some((d) => d.slug === q.slug)
      ? [prisma.dndRemovedContent.upsert({ where: { kind_slug: { kind: "QUEST", slug: q.slug } }, create: { kind: "QUEST", slug: q.slug }, update: {} })]
      : []),
  ]);
  return { ok: true };
}

/** Gelöschten festen Inhalt wieder zulassen (wird beim nächsten Seed neu angelegt). */
export async function restoreRemoved(kind: "LOCATION" | "QUEST", slug: string): Promise<void> {
  await prisma.dndRemovedContent.deleteMany({ where: { kind, slug } });
  if (kind === "LOCATION") await prisma.dndRemovedContent.deleteMany({ where: { kind: "QUEST", slug: { in: fixedQuestSlugs(slug) } } });
}

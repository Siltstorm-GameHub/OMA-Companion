// ============================================
// OMA Quest — Chronik der Welt („Heute im Reich")
// ============================================

import { prisma } from "../prisma";

export type ChronicleKind = "quest" | "level" | "location" | "announce" | "event";

/** Eintrag schreiben. Die Chronik ist Zierde und darf nie etwas scheitern lassen. */
export async function logChronicle(kind: ChronicleKind, text: string, locationSlug?: string | null): Promise<void> {
  try {
    await prisma.dndChronicle.create({ data: { kind, text: text.slice(0, 400), locationSlug: locationSlug ?? null } });
    // Nur die letzten Wochen behalten (billiges Aufräumen)
    if (Math.random() < 0.02) await prisma.dndChronicle.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 45 * 24 * 3600_000) } } });
  } catch {
    // ignorieren
  }
}

export async function recentChronicle(limit = 15) {
  return prisma.dndChronicle.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}

// ============================================
// OMA Quest — Gruppen (Party): bis zu 4 Charaktere, teilen XP für Welt-Quests am selben Ort
// ============================================

import { prisma } from "../prisma";

export const MAX_PARTY = 4;

export interface PartyView {
  id: string;
  leaderCardId: string;
  members: { cardId: string; name: string; here: boolean }[];
}
export interface InviteView { id: string; fromCardId: string; fromName: string }

export async function getPartyOf(cardId: string): Promise<PartyView | null> {
  const m = await prisma.dndPartyMember.findUnique({ where: { cardId }, include: { party: { include: { members: true } } } });
  if (!m) return null;
  const cards = await prisma.card.findMany({
    where: { id: { in: m.party.members.map((x) => x.cardId) } },
    select: { id: true, name: true, currentLocationId: true, travelToCol: true },
  });
  const mine = cards.find((c) => c.id === cardId);
  return {
    id: m.party.id,
    leaderCardId: m.party.leaderCardId,
    members: cards.map((c) => ({ cardId: c.id, name: c.name, here: !!mine?.currentLocationId && c.currentLocationId === mine.currentLocationId && c.travelToCol == null })),
  };
}

export async function getInvitesFor(cardId: string): Promise<InviteView[]> {
  const rows = await prisma.dndPartyInvite.findMany({ where: { toCardId: cardId }, orderBy: { createdAt: "desc" }, take: 10 });
  if (!rows.length) return [];
  const cards = await prisma.card.findMany({ where: { id: { in: rows.map((r) => r.fromCardId) } }, select: { id: true, name: true } });
  const name = new Map(cards.map((c) => [c.id, c.name]));
  return rows.map((r) => ({ id: r.id, fromCardId: r.fromCardId, fromName: name.get(r.fromCardId) ?? "?" }));
}

/** Einladen: der Einladende gründet bei Bedarf die Gruppe; beide müssen am selben Ort sein. */
export async function invite(fromCardId: string, toCardId: string): Promise<{ ok: true } | { error: string }> {
  if (fromCardId === toCardId) return { error: "Du kannst dich nicht selbst einladen." };
  const [from, to] = await Promise.all([
    prisma.card.findUnique({ where: { id: fromCardId }, select: { currentLocationId: true, travelToCol: true } }),
    prisma.card.findUnique({ where: { id: toCardId }, select: { currentLocationId: true, travelToCol: true, dndCreatedAt: true } }),
  ]);
  if (!from || !to?.dndCreatedAt) return { error: "Charakter nicht gefunden." };
  if (!from.currentLocationId || from.currentLocationId !== to.currentLocationId || from.travelToCol != null || to.travelToCol != null) return { error: "Ihr müsst am selben Ort sein." };
  if (await prisma.dndPartyMember.findUnique({ where: { cardId: toCardId } })) return { error: "Der Charakter ist schon in einer Gruppe." };
  const mine = await getPartyOf(fromCardId);
  if (mine && mine.members.length >= MAX_PARTY) return { error: `Eine Gruppe hat höchstens ${MAX_PARTY} Mitglieder.` };
  await prisma.dndPartyInvite.upsert({ where: { fromCardId_toCardId: { fromCardId, toCardId } }, create: { fromCardId, toCardId }, update: { createdAt: new Date() } });
  return { ok: true };
}

export async function respond(cardId: string, inviteId: string, accept: boolean): Promise<{ ok: true } | { error: string }> {
  const inv = await prisma.dndPartyInvite.findUnique({ where: { id: inviteId } });
  if (!inv || inv.toCardId !== cardId) return { error: "Einladung nicht gefunden." };
  if (!accept) { await prisma.dndPartyInvite.delete({ where: { id: inviteId } }); return { ok: true }; }
  if (await prisma.dndPartyMember.findUnique({ where: { cardId } })) return { error: "Du bist schon in einer Gruppe." };

  let party = await getPartyOf(inv.fromCardId);
  if (!party) {
    const created = await prisma.dndParty.create({ data: { leaderCardId: inv.fromCardId, members: { create: { cardId: inv.fromCardId } } } });
    party = { id: created.id, leaderCardId: inv.fromCardId, members: [{ cardId: inv.fromCardId, name: "", here: true }] };
  }
  if (party.members.length >= MAX_PARTY) return { error: "Die Gruppe ist voll." };
  await prisma.dndPartyMember.create({ data: { cardId, partyId: party.id } });
  await prisma.dndPartyInvite.deleteMany({ where: { toCardId: cardId } });
  return { ok: true };
}

export async function leave(cardId: string): Promise<void> {
  const m = await prisma.dndPartyMember.findUnique({ where: { cardId }, include: { party: { include: { members: true } } } });
  if (!m) return;
  await prisma.dndPartyMember.delete({ where: { cardId } });
  const rest = m.party.members.filter((x) => x.cardId !== cardId);
  if (rest.length <= 1) { await prisma.dndParty.delete({ where: { id: m.partyId } }); return; }
  if (m.party.leaderCardId === cardId) await prisma.dndParty.update({ where: { id: m.partyId }, data: { leaderCardId: rest[0].cardId } });
}

/** Gruppenmitglieder am selben Ort (ohne den Auslöser) bekommen die Hälfte der XP einer abgeschlossenen Welt-Quest. */
export async function shareXpWithParty(cardId: string, xp: number, locationSlug: string): Promise<number> {
  const share = Math.ceil(xp / 2);
  if (share <= 0) return 0;
  const m = await prisma.dndPartyMember.findUnique({ where: { cardId }, include: { party: { include: { members: true } } } });
  if (!m) return 0;
  const others = m.party.members.map((x) => x.cardId).filter((id) => id !== cardId);
  if (!others.length) return 0;
  const here = await prisma.card.findMany({
    where: { id: { in: others }, travelToCol: null, currentLocation: { slug: locationSlug } },
    select: { id: true },
  });
  if (!here.length) return 0;
  await prisma.card.updateMany({ where: { id: { in: here.map((c) => c.id) } }, data: { dndXp: { increment: share } } });
  return here.length;
}

// ============================================
// OMA Quest — Gruppen (Party): bis zu 4 Charaktere (Raid-Modus: 8), teilen XP für Welt-Quests am selben Ort, kämpfen gemeinsam
// ============================================

import { prisma } from "../prisma";

export const MAX_PARTY = 4;
export const MAX_RAID = 8;
export const maxPartySize = (raid: boolean): number => (raid ? MAX_RAID : MAX_PARTY);

export interface PartyView {
  id: string;
  leaderCardId: string;
  name: string | null;
  raid: boolean;
  wins: number;
  max: number;
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
    name: m.party.name, raid: m.party.raid, wins: m.party.wins, max: maxPartySize(m.party.raid),
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
  if (mine && mine.members.length >= mine.max) return { error: `Diese Gruppe hat höchstens ${mine.max} Mitglieder.${mine.raid ? "" : " Der Anführer kann den Raid-Modus einschalten (bis 8)."}` };
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
    party = { id: created.id, leaderCardId: inv.fromCardId, name: null, raid: false, wins: 0, max: MAX_PARTY, members: [{ cardId: inv.fromCardId, name: "", here: true }] };
  }
  if (party.members.length >= party.max) return { error: "Die Gruppe ist voll." };
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

/** Anführer entfernt ein Mitglied. */
export async function kick(leaderCardId: string, targetCardId: string): Promise<{ ok: true } | { error: string }> {
  if (leaderCardId === targetCardId) return { error: "Du kannst dich nicht selbst entfernen — nutze „Gruppe verlassen“." };
  const party = await getPartyOf(leaderCardId);
  if (!party || party.leaderCardId !== leaderCardId) return { error: "Nur der Gruppenleiter kann Mitglieder entfernen." };
  if (!party.members.some((m) => m.cardId === targetCardId)) return { error: "Das Mitglied ist nicht in deiner Gruppe." };
  await leave(targetCardId);
  return { ok: true };
}

/** Anführer schaltet den Raid-Modus (bis zu 8 Mitglieder) ein oder aus; aus nur, wenn höchstens 4 Mitglieder da sind. */
export async function setRaid(leaderCardId: string, on: boolean): Promise<{ ok: true } | { error: string }> {
  const party = await getPartyOf(leaderCardId);
  if (!party || party.leaderCardId !== leaderCardId) return { error: "Nur der Gruppenleiter kann den Raid-Modus ändern." };
  if (!on && party.members.length > MAX_PARTY) return { error: `Erst Mitglieder entfernen: ohne Raid-Modus sind höchstens ${MAX_PARTY} erlaubt.` };
  await prisma.dndParty.update({ where: { id: party.id }, data: { raid: on } });
  return { ok: true };
}

export async function renameParty(leaderCardId: string, name: unknown): Promise<{ ok: true } | { error: string }> {
  const party = await getPartyOf(leaderCardId);
  if (!party || party.leaderCardId !== leaderCardId) return { error: "Nur der Gruppenleiter kann die Gruppe umbenennen." };
  const clean = typeof name === "string" ? name.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 24) : "";
  if (clean && /https?:\/\/|www\.|discord\.gg/i.test(clean)) return { error: "Der Name darf keine Links enthalten." };
  await prisma.dndParty.update({ where: { id: party.id }, data: { name: clean || null } });
  return { ok: true };
}

/** Anführer ernennt ein anderes Mitglied zum Anführer. */
export async function transferLead(leaderCardId: string, targetCardId: string): Promise<{ ok: true } | { error: string }> {
  const party = await getPartyOf(leaderCardId);
  if (!party || party.leaderCardId !== leaderCardId) return { error: "Nur der Gruppenleiter kann die Führung abgeben." };
  if (!party.members.some((m) => m.cardId === targetCardId) || targetCardId === leaderCardId) return { error: "Das Mitglied ist nicht in deiner Gruppe." };
  await prisma.dndParty.update({ where: { id: party.id }, data: { leaderCardId: targetCardId } });
  return { ok: true };
}

/** Bestenliste der Gruppen nach gewonnenen Kämpfen. */
export async function partyLeaderboard(limit = 10, myPartyId?: string | null) {
  const rows = await prisma.dndParty.findMany({ where: { wins: { gt: 0 } }, orderBy: [{ wins: "desc" }, { createdAt: "asc" }], take: limit, include: { _count: { select: { members: true } } } });
  const cards = await prisma.card.findMany({ where: { id: { in: rows.map((r) => r.leaderCardId) } }, select: { id: true, name: true } });
  const leader = new Map(cards.map((c) => [c.id, c.name]));
  return rows.map((r, i) => ({ position: i + 1, name: r.name || `Gruppe von ${leader.get(r.leaderCardId) ?? "?"}`, wins: r.wins, size: r._count.members, mine: r.id === myPartyId }));
}

/** Gemeinsam reisen: Ein Mitglied übernimmt die laufende Reise des Anführers, wenn es am selben Startfeld steht. */
export async function followLeader(cardId: string): Promise<{ ok: true } | { error: string }> {
  const party = await getPartyOf(cardId);
  if (!party) return { error: "Du bist in keiner Gruppe." };
  if (party.leaderCardId === cardId) return { error: "Du bist der Anführer." };
  const [leader, me] = await Promise.all([
    prisma.card.findUnique({ where: { id: party.leaderCardId } }),
    prisma.card.findUnique({ where: { id: cardId } }),
  ]);
  if (!leader || !me) return { error: "Charakter nicht gefunden." };
  if (leader.travelToCol == null || !Array.isArray(leader.travelPath)) return { error: "Der Anführer ist nicht unterwegs." };
  if (me.travelToCol != null) return { error: "Du bist selbst schon unterwegs." };
  const start = leader.travelPath[0] as number[];
  if (!start || me.currentHexCol !== start[0] || me.currentHexRow !== start[1]) return { error: "Du musst am Startfeld der Reise stehen." };
  await prisma.card.update({
    where: { id: cardId },
    data: {
      travelToCol: leader.travelToCol, travelToRow: leader.travelToRow, travelPath: leader.travelPath as never,
      travelDepartedAt: leader.travelDepartedAt, travelArrivesAt: leader.travelArrivesAt,
    },
  });
  return { ok: true };
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

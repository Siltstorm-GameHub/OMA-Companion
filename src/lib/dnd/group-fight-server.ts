// ============================================
// OMA Quest — Gruppenkampf (Server): Vorraum mit Zustimmung, Kampfablauf, Belohnungen
// ============================================
// Ablauf: Ein Gruppenmitglied startet den Kampf → Vorraum (LOBBY), alle anderen Mitglieder am selben Ort werden eingeladen und haben 10 Sekunden,
// beizutreten. Danach entscheidet der Auslöser: abbrechen oder ohne die Unentschlossenen starten (sind alle fertig, geht es sofort los). Im Kampf
// (ACTIVE) ist jeder Held nacheinander dran; Änderungen prüfen eine Versionsnummer (v), damit gleichzeitige Klicks nichts doppelt tun.

import type { Card, DndGroupFight, DndGroupFightMember } from "@prisma/client";
import { prisma } from "../prisma";
import { getMonster, type Monster } from "./combat";
import { advanceDndQuestObjective } from "./quests";
import { checkEncounter, fighterOf, markSlain, slainOf } from "./combat-server";
import { grantRewards } from "./rpg-server";
import { logChronicle } from "./chronicle";
import { getPartyOf, MAX_PARTY } from "./party";
import { applyTimeouts, groupRewards, isGroupAction, performGroupAction, startGroupCombat, type GroupActionKind, type GroupState } from "./group-combat";
import { levelOf } from "../te-map/rpg";
import { effectiveTeCharacter } from "../battle-cards/standard-avatars";

export const LOBBY_MS = 10_000;
/** Ein Vorraum, den der Auslöser nicht entscheidet, verfällt nach dieser Zeit. */
const LOBBY_STALE_MS = 3 * 60_000;
const FINISHED = ["WON", "LOST", "FLED"];

export interface GroupFightView {
  id: string;
  status: string;
  initiatorCardId: string;
  monsterId: string;
  lobbyEndsAt: number;
  serverNow: number;
  members: { cardId: string; name: string; status: string }[];
  myStatus: string;
  state: GroupState | null;
  /** Ergebnis schon bestätigt? (dann zeigt die Oberfläche nichts mehr) */
  seen: boolean;
}

type Full = DndGroupFight & { members: DndGroupFightMember[] };
type Res = { ok: true } | { error: string };
const RACE = { error: "Zu schnell — versuch es noch einmal." } as const;

const stateOf = (f: DndGroupFight): GroupState | null => (f.state && typeof f.state === "object" ? (f.state as unknown as GroupState) : null);

async function toView(f: Full, cardId: string): Promise<GroupFightView> {
  const cards = await prisma.card.findMany({ where: { id: { in: f.members.map((m) => m.cardId) } }, select: { id: true, name: true } });
  const name = new Map(cards.map((c) => [c.id, c.name]));
  const mine = f.members.find((m) => m.cardId === cardId);
  return {
    id: f.id, status: f.status, initiatorCardId: f.initiatorCardId, monsterId: f.monsterId, lobbyEndsAt: f.lobbyEndsAt.getTime(), serverNow: Date.now(),
    members: f.members.map((m) => ({ cardId: m.cardId, name: name.get(m.cardId) ?? "?", status: m.status })),
    myStatus: mine?.status ?? "", state: stateOf(f), seen: !!mine?.seen,
  };
}

async function saveState(f: DndGroupFight, data: { status?: string; state?: GroupState | null }): Promise<boolean> {
  const r = await prisma.dndGroupFight.updateMany({
    where: { id: f.id, v: f.v },
    data: { v: { increment: 1 }, ...(data.status ? { status: data.status } : {}), ...(data.state !== undefined ? { state: data.state ? JSON.parse(JSON.stringify(data.state)) : null } : {}) },
  });
  return r.count === 1;
}

/** Der Kampf (Vorraum, laufend oder frisch beendet), in dem dieser Held gerade steckt. */
export async function getMyFight(cardId: string): Promise<Full | null> {
  const rows = await prisma.dndGroupFightMember.findMany({
    where: { cardId, status: { in: ["invited", "joined"] }, fight: { OR: [{ status: { in: ["LOBBY", "ACTIVE"] } }, { status: { in: FINISHED }, updatedAt: { gt: new Date(Date.now() - 30 * 60_000) } }] } },
    include: { fight: { include: { members: true } } },
    orderBy: { fight: { createdAt: "desc" } },
    take: 5,
  });
  for (const r of rows) {
    const f = r.fight;
    if (FINISHED.includes(f.status) && r.seen) continue;
    if (r.status === "invited" && f.status !== "LOBBY") continue;
    return f;
  }
  return null;
}

export async function hasOpenGroupFight(cardId: string): Promise<boolean> {
  const f = await getMyFight(cardId);
  return !!f && (f.status === "LOBBY" || f.status === "ACTIVE");
}

/** Abfrage der Oberfläche: hält den Kampf aktuell (Zeitüberschreitungen, verwaiste Vorräume) und liefert die Ansicht. */
export async function pollFight(card: Card): Promise<GroupFightView | null> {
  let f = await getMyFight(card.id);
  if (!f) return null;
  const now = Date.now();
  if (f.status === "LOBBY" && now - f.createdAt.getTime() > LOBBY_STALE_MS) {
    await prisma.dndGroupFight.updateMany({ where: { id: f.id, status: "LOBBY" }, data: { status: "CANCELLED" } });
    return null;
  }
  if (f.status === "ACTIVE") {
    const st = stateOf(f);
    if (st) {
      const next = applyTimeouts(st, now);
      if (next !== st) {
        if (await saveState(f, { state: next, ...(next.status !== "active" ? { status: next.status.toUpperCase() } : {}) })) {
          if (next.status !== "active") await finalize(f.id, next);
        }
        f = (await prisma.dndGroupFight.findUnique({ where: { id: f.id }, include: { members: true } })) ?? f;
      }
    }
  }
  return toView(f, card.id);
}

/** Party-Mitglieder, die jetzt mit diesem Helden am selben Ort stehen. */
async function membersHere(cardId: string): Promise<{ id: string; name: string }[]> {
  const party = await getPartyOf(cardId);
  if (!party) return [];
  return party.members.filter((m) => m.here && m.cardId !== cardId).map((m) => ({ id: m.cardId, name: m.name }));
}

/** Kann dieser Held gerade eine Gruppen-Begegnung starten? Für die Oberfläche (Knopf „Mit Gruppe“). */
export async function groupInfo(cardId: string): Promise<{ inParty: boolean; here: number; size: number; raid: boolean; max: number; leader: boolean; memberIds: string[] }> {
  const party = await getPartyOf(cardId);
  if (!party) return { inParty: false, here: 0, size: 0, raid: false, max: MAX_PARTY, leader: false, memberIds: [] };
  return { inParty: true, here: party.members.filter((m) => m.here).length, size: party.members.length, raid: party.raid, max: party.max, leader: party.leaderCardId === cardId, memberIds: party.members.map((m) => m.cardId) };
}

export async function startLobby(card: Card, monsterId: string, source?: { slug: string; actor: string }): Promise<Res> {
  if (await hasOpenGroupFight(card.id)) return { error: "Du steckst schon in einem Gruppenkampf." };
  if ((card.dndCombat as { status?: string } | null)?.status === "active") return { error: "Du steckst schon in einem Einzelkampf." };
  const party = await getPartyOf(card.id);
  if (!party) return { error: "Du bist in keiner Gruppe." };
  const chk = await checkEncounter(card, monsterId, source, true);
  if ("error" in chk) return chk;
  if (chk.m.raid && !party.raid) return { error: "Dafür braucht die Gruppe den Raid-Modus (der Anführer schaltet ihn ein)." };
  if (source && chk.view.slain.includes(`${source.slug}:${source.actor}`)) return { error: "Das Monster ist gerade besiegt." };

  const others = await membersHere(card.id);
  // Wer schon in einem anderen Kampf steckt, wird nicht eingeladen
  const free: { id: string; name: string }[] = [];
  for (const o of others) if (!(await hasOpenGroupFight(o.id))) free.push(o);
  if (!free.length) return { error: "Kein anderes Gruppenmitglied ist gerade am selben Ort und frei." };

  await prisma.dndGroupFight.create({
    data: {
      status: "LOBBY", initiatorCardId: card.id, monsterId, source: source ? { ...source } : undefined, lobbyEndsAt: new Date(Date.now() + LOBBY_MS),
      members: { create: [{ cardId: card.id, status: "joined" }, ...free.map((o) => ({ cardId: o.id, status: "invited" }))] },
    },
  });
  return { ok: true };
}

export async function respondLobby(card: Card, fightId: string, accept: boolean): Promise<Res> {
  const f = await prisma.dndGroupFight.findUnique({ where: { id: fightId }, include: { members: true } });
  const me = f?.members.find((m) => m.cardId === card.id);
  if (!f || f.status !== "LOBBY" || !me) return { error: "Diese Einladung gibt es nicht mehr." };
  if (me.status !== "invited") return { ok: true };
  if (accept && (await hasOpenGroupFight(card.id).then(async (open) => open && (await getMyFight(card.id))?.id !== f.id))) return { error: "Du steckst schon in einem anderen Kampf." };
  await prisma.dndGroupFightMember.update({ where: { fightId_cardId: { fightId, cardId: card.id } }, data: { status: accept ? "joined" : "declined" } });
  // Haben alle geantwortet, geht es sofort los
  const left = await prisma.dndGroupFightMember.count({ where: { fightId, status: "invited" } });
  if (left === 0) {
    const initiator = await prisma.card.findUnique({ where: { id: f.initiatorCardId } });
    if (initiator) await beginFight(initiator, fightId, true);
  }
  return { ok: true };
}

export async function cancelLobby(card: Card, fightId: string): Promise<Res> {
  const f = await prisma.dndGroupFight.findUnique({ where: { id: fightId } });
  if (!f || f.status !== "LOBBY") return { error: "Kein Vorraum mehr." };
  if (f.initiatorCardId !== card.id) return { error: "Nur wer den Kampf gestartet hat, kann ihn abbrechen." };
  await prisma.dndGroupFight.updateMany({ where: { id: fightId, status: "LOBBY" }, data: { status: "CANCELLED" } });
  return { ok: true };
}

/** Kampf beginnen: mit allen, die beigetreten sind (ab 10 Sekunden auch ohne die Unentschlossenen). */
export async function beginFight(card: Card, fightId: string, auto = false): Promise<Res> {
  const f = await prisma.dndGroupFight.findUnique({ where: { id: fightId }, include: { members: true } });
  if (!f || f.status !== "LOBBY") return { error: "Kein Vorraum mehr." };
  if (f.initiatorCardId !== card.id) return { error: "Nur wer den Kampf gestartet hat, kann ihn beginnen." };
  const invited = f.members.filter((m) => m.status === "invited");
  if (!auto && invited.length && Date.now() < f.lobbyEndsAt.getTime()) return { error: "Noch warten — die Mitglieder haben 10 Sekunden Zeit." };
  const monster: Monster | undefined = getMonster(f.monsterId);
  if (!monster) return { error: "Unbekanntes Monster." };
  const joined = f.members.filter((m) => m.status === "joined");
  if (monster.raid && joined.length < monster.raid.min) return { error: `${monster.name} braucht mindestens ${monster.raid.min} Helden (aktuell ${joined.length}).` };
  if (!monster.raid && joined.length > MAX_PARTY) return { error: `Gegen dieses Monster dürfen höchstens ${MAX_PARTY} Helden kämpfen.` };

  const cards = await prisma.card.findMany({ where: { id: { in: joined.map((m) => m.cardId) } } });
  // Der Auslöser steht vorn, der Rest in der Reihenfolge des Beitritts
  const ordered = [...joined].sort((a, b) => Number(b.cardId === f.initiatorCardId) - Number(a.cardId === f.initiatorCardId)).map((m) => cards.find((c) => c.id === m.cardId)).filter((c): c is Card => !!c);
  const fighters = await Promise.all(ordered.map(async (c) => ({ cardId: c.id, name: c.name, fighter: await fighterOf(c), character: effectiveTeCharacter(c) })));
  const state = startGroupCombat(monster, fighters, Date.now(), (f.source as { slug: string; actor: string } | null) ?? undefined);
  if (!(await saveState(f, { status: "ACTIVE", state }))) return RACE;
  if (invited.length) await prisma.dndGroupFightMember.updateMany({ where: { fightId, status: "invited" }, data: { status: "declined" } });
  return { ok: true };
}

export async function actInFight(card: Card, fightId: string, action: unknown, target?: string): Promise<Res> {
  if (!isGroupAction(action)) return { error: "Ungültige Aktion" };
  const f = await prisma.dndGroupFight.findUnique({ where: { id: fightId }, include: { members: true } });
  if (!f || f.status !== "ACTIVE" || !f.members.some((m) => m.cardId === card.id && m.status === "joined")) return { error: "Du kämpfst gerade nicht mit." };
  const st = stateOf(f);
  if (!st) return { error: "Kein Kampfzustand." };
  const now = Date.now();
  const timed = applyTimeouts(st, now);
  const r = performGroupAction(timed, card.id, action as GroupActionKind, target, now);
  if (r.error) {
    // Auch bei einer verpassten Runde den Zeitablauf sichern
    if (timed !== st) await saveState(f, { state: timed, ...(timed.status !== "active" ? { status: timed.status.toUpperCase() } : {}) });
    return { error: r.error };
  }
  const next = r.state;
  if (!(await saveState(f, { state: next, ...(next.status !== "active" ? { status: next.status.toUpperCase() } : {}) }))) return RACE;
  if (next.status !== "active") await finalize(f.id, next);
  return { ok: true };
}

/** Ergebnis bestätigt: der Kampf verschwindet für diesen Helden. */
export async function closeFight(card: Card, fightId: string): Promise<Res> {
  await prisma.dndGroupFightMember.updateMany({ where: { fightId, cardId: card.id }, data: { seen: true } });
  return { ok: true };
}

/** Kampfende: Belohnungen/Verluste buchen, besiegte Figuren markieren, Quests zählen, Gruppen-Siege zählen. */
async function finalize(fightId: string, state: GroupState): Promise<void> {
  const f = await prisma.dndGroupFight.findUnique({ where: { id: fightId } });
  if (!f) return;
  const m = getMonster(state.monsterId);
  if (state.status === "lost") {
    for (const h of state.heroes.filter((x) => !x.left)) {
      const c = await prisma.card.findUnique({ where: { id: h.cardId }, select: { dndGold: true } });
      if (c) await prisma.card.update({ where: { id: h.cardId }, data: { dndGold: { decrement: Math.floor(c.dndGold * 0.1) } } });
    }
    return;
  }
  if (state.status !== "won" || !m) return;

  const rewards = groupRewards(state);
  for (const r of rewards) {
    const c = await prisma.card.findUnique({ where: { id: r.cardId } });
    if (!c) continue;
    const before = levelOf(c.dndXp);
    const granted = await grantRewards(c, { xp: r.xp, gold: r.gold, items: r.items });
    r.xp = granted.xp; r.gold = granted.gold; r.items = granted.items;
    r.levelUp = levelOf(c.dndXp + granted.xp) > before ? levelOf(c.dndXp + granted.xp) : null;
    if (state.source) await markSlain(r.cardId, state.source);
    await advanceDndQuestObjective(r.cardId, "MONSTER_SLAIN", 1, m.id).catch(() => {});
  }
  // Ergebnis für die Anzeige am Kampfzustand festhalten
  await prisma.dndGroupFight.update({ where: { id: fightId }, data: { state: JSON.parse(JSON.stringify({ ...state, results: rewards })) } });
  const party = await prisma.dndPartyMember.findUnique({ where: { cardId: f.initiatorCardId }, select: { partyId: true } });
  if (party) await prisma.dndParty.update({ where: { id: party.partyId }, data: { wins: { increment: 1 } } }).catch(() => {});
  if (m.level >= 6 || m.raid) await logChronicle("event", `Eine Gruppe (${rewards.map((r) => r.name).join(", ")}) hat ${m.name} besiegt.`, undefined);
}

export { slainOf };

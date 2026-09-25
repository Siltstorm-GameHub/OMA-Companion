// ============================================
// Battle-Cards-Hub — Held-Reiter: Daten des Cockpits (Server)
// ============================================
// Bündelt, was der Held-Reiter neben der Karte selbst zeigt: wo der Held gerade ist, verfolgte Quests, Gruppe samt Einladungen und die
// Chronik der Welt. Alles rein lesend; Quest-Daten gibt es erst, wenn der Quest-Charakter erstellt ist.

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import { recentChronicle } from "../dnd/chronicle";
import { getInvitesFor, getPartyOf, type InviteView, type PartyView } from "../dnd/party";
import { getTracker, type TrackerItem } from "../dnd/quest-log";
import { syncLevelRewards } from "../dnd/progression";

export interface HeroPlace {
  name: string;
  /** Held ist auf Reisen (Zielfeld gesetzt) */
  travelling: boolean;
}

export interface HeroCockpit {
  /** Stand nach dem Abrechnen fehlender Stufenbelohnungen */
  card: Card;
  place: HeroPlace | null;
  tracker: TrackerItem[];
  party: PartyView | null;
  invites: InviteView[];
  chronicle: { id: string; kind: string; text: string; createdAt: string }[];
}

export async function getHeroCockpit(card: Card): Promise<HeroCockpit> {
  // Attributspunkte/Fähigkeitswahlen sind lazy: erst hier stimmt die Zahl "offen" für alle XP-Quellen
  const fresh = card.dndCreatedAt ? await syncLevelRewards(card) : card;
  const hasQuestHero = !!fresh.dndCreatedAt;

  const [location, tracker, party, invites, chronicle] = await Promise.all([
    fresh.currentLocationId
      ? prisma.dndLocation.findUnique({ where: { id: fresh.currentLocationId }, select: { name: true } })
      : Promise.resolve(null),
    hasQuestHero ? getTracker(fresh.id) : Promise.resolve([] as TrackerItem[]),
    hasQuestHero ? getPartyOf(fresh.id) : Promise.resolve(null),
    hasQuestHero ? getInvitesFor(fresh.id) : Promise.resolve([] as InviteView[]),
    recentChronicle(6),
  ]);

  return {
    card: fresh,
    place: location ? { name: location.name, travelling: fresh.travelToCol != null } : null,
    tracker,
    party,
    invites,
    chronicle: chronicle.map((c) => ({ id: c.id, kind: c.kind, text: c.text, createdAt: c.createdAt.toISOString() })),
  };
}

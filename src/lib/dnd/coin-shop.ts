// ============================================
// OMA Quest — Münzen-Laden: besondere Dinge für App-Münzen
// ============================================
// Gold gibt es nur im Spiel und wird bei Händlern ausgegeben (Ausrüstung, Alltag). Münzen sind die App-Münzen (wie im Rest der App, siehe
// CoinIcon) und kaufen hier Besonderes: eine zusätzliche Fähigkeitswahl, Neuverteilen von Attributen/Fähigkeiten, Ehrentitel.
// Abgebucht wird atomar wie überall in der App (WHERE points >= Preis) und als PointTransaction verbucht.

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import { abilityBonusOf, perksOf } from "./progression";
import { skillsOf } from "./skills-server";

export type CoinItemKind = "perk-pick" | "respec-attr" | "respec-perks" | "respec-skills" | "title";

export interface CoinItem {
  id: string;
  kind: CoinItemKind;
  name: string;
  icon: string;
  desc: string;
  price: number;
  /** Nur bei kind "title": der Ehrentitel */
  title?: string;
  /** Höchstens so oft kaufbar (nur perk-pick) */
  maxBuys?: number;
}

export const COIN_ITEMS: CoinItem[] = [
  { id: "perk-pick", kind: "perk-pick", name: "Zusätzliche Fähigkeit", icon: "🎓", desc: "Eine weitere Fähigkeit zum Wählen — zusätzlich zu den Stufenbelohnungen.", price: 400, maxBuys: 2 },
  { id: "respec-attr", kind: "respec-attr", name: "Attribute neu verteilen", icon: "🔄", desc: "Setzt alle verteilten Attributspunkte zurück; du bekommst sie zum neu Verteilen zurück.", price: 150 },
  { id: "respec-perks", kind: "respec-perks", name: "Fähigkeiten neu wählen", icon: "🧭", desc: "Vergisst alle gewählten Fähigkeiten; du bekommst die Wahlen zurück.", price: 150 },
  { id: "respec-skills", kind: "respec-skills", name: "Talente neu lernen", icon: "🌟", desc: "Vergisst den ganzen Fähigkeitsbaum; alle Talentpunkte gibt es zurück.", price: 150 },
];

/** Ehrentitel, mit denen der Katalog beim ersten Aufruf gefüllt wird; danach pflegt der Admin ihn (Tabelle DndTitleDef). */
const DEFAULT_TITLES: { name: string; icon: string; desc: string; price: number }[] = [
  { name: "Der Unerschrockene", icon: "🛡️", desc: "Ein Titel für Mutige — erscheint statt deines Stufen-Titels.", price: 150 },
  { name: "Wirtshaus-Legende", icon: "🍺", desc: "Man kennt dich in jeder Taverne.", price: 150 },
  { name: "Sockenkönig", icon: "🧦", desc: "Sammler grün gestreifter Socken. Selten und sehr warm.", price: 200 },
];

/** Aktive Titel als Angebote (füllt den Katalog beim allerersten Aufruf mit den Standard-Titeln). */
export async function titleItems(): Promise<CoinItem[]> {
  if ((await prisma.dndTitleDef.count()) === 0) await prisma.dndTitleDef.createMany({ data: DEFAULT_TITLES.map((d, i) => ({ ...d, sortOrder: i })), skipDuplicates: true });
  const rows = await prisma.dndTitleDef.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map((r) => ({ id: `title-${r.id}`, kind: "title" as const, name: `Ehrentitel: ${r.name}`, icon: r.icon, desc: r.desc, price: r.price, title: r.name }));
}

export const allCoinItems = async (): Promise<CoinItem[]> => [...COIN_ITEMS, ...(await titleItems())];
export const getCoinItem = async (id: string): Promise<CoinItem | undefined> => (await allCoinItems()).find((i) => i.id === id);

export const ownedTitlesOf = (card: Pick<Card, "dndOwnedTitles">): string[] =>
  (Array.isArray(card.dndOwnedTitles) ? (card.dndOwnedTitles as unknown[]).filter((t): t is string => typeof t === "string") : []);

/** Angezeigter Titel: gewählter Ehrentitel (falls noch im Besitz), sonst der Stufen-Titel. */
export const displayTitle = (card: Pick<Card, "dndTitle" | "dndOwnedTitles">, levelTitle: string): string =>
  card.dndTitle && ownedTitlesOf(card).includes(card.dndTitle) ? card.dndTitle : levelTitle;

export interface CoinShopEntry extends CoinItem { available: boolean; reason?: string; owned?: boolean }

/** Katalog mit Verfügbarkeit für diesen Charakter (was ist sinnvoll/kaufbar). */
export function coinShopFor(card: Card, items: CoinItem[]): CoinShopEntry[] {
  const owned = ownedTitlesOf(card);
  return items.map((i) => {
    if (i.kind === "perk-pick") return card.dndCoinPerkBuys >= (i.maxBuys ?? 1) ? { ...i, available: false, reason: "Schon so oft gekauft, wie es geht." } : { ...i, available: true };
    if (i.kind === "respec-attr") return Object.keys(abilityBonusOf(card)).length ? { ...i, available: true } : { ...i, available: false, reason: "Du hast keine Attributspunkte verteilt." };
    if (i.kind === "respec-skills") return skillsOf(card).length ? { ...i, available: true } : { ...i, available: false, reason: "Du hast noch kein Talent gelernt." };
    if (i.kind === "respec-perks") return perksOf(card).length ? { ...i, available: true } : { ...i, available: false, reason: "Du hast noch keine Fähigkeit gewählt." };
    return owned.includes(i.title ?? "") ? { ...i, available: false, owned: true, reason: "Schon dein Titel." } : { ...i, available: true };
  });
}

export async function buyCoinItem(userId: string, card: Card, itemId: string): Promise<{ ok: true; coins: number } | { error: string }> {
  const items = await allCoinItems();
  const item = items.find((i) => i.id === itemId);
  if (!item) return { error: "Unbekanntes Angebot" };
  const entry = coinShopFor(card, items).find((e) => e.id === itemId);
  if (!entry?.available) return { error: entry?.reason ?? "Nicht verfügbar" };

  // Erst Münzen atomar abbuchen (nur wenn genug da sind), dann die Wirkung anwenden
  const debit = await prisma.user.updateMany({ where: { id: userId, points: { gte: item.price } }, data: { points: { decrement: item.price } } });
  if (!debit.count) return { error: "Nicht genug Münzen" };
  await prisma.pointTransaction.create({ data: { userId, amount: -item.price, reason: `OMA Quest: ${item.name}` } });

  if (item.kind === "perk-pick") {
    await prisma.card.update({ where: { id: card.id }, data: { dndPerkPicks: { increment: 1 }, dndCoinPerkBuys: { increment: 1 } } });
  } else if (item.kind === "respec-attr") {
    const refund = Object.values(abilityBonusOf(card)).reduce((s, v) => s + (v ?? 0), 0);
    await prisma.card.update({ where: { id: card.id }, data: { dndAbilityBonus: {}, dndAttrPoints: { increment: refund } } });
  } else if (item.kind === "respec-skills") {
    await prisma.card.update({ where: { id: card.id }, data: { dndSkills: [] } });
  } else if (item.kind === "respec-perks") {
    await prisma.card.update({ where: { id: card.id }, data: { dndPerks: [], dndPerkPicks: { increment: perksOf(card).length } } });
  } else if (item.title) {
    await prisma.card.update({ where: { id: card.id }, data: { dndOwnedTitles: [...ownedTitlesOf(card), item.title], dndTitle: item.title } });
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  return { ok: true, coins: user?.points ?? 0 };
}

/** Ehrentitel wählen (null = Stufen-Titel). */
export async function equipTitle(card: Card, title: unknown): Promise<{ ok: true } | { error: string }> {
  if (title === null) { await prisma.card.update({ where: { id: card.id }, data: { dndTitle: null } }); return { ok: true }; }
  if (typeof title !== "string" || !ownedTitlesOf(card).includes(title)) return { error: "Diesen Titel hast du nicht." };
  await prisma.card.update({ where: { id: card.id }, data: { dndTitle: title } });
  return { ok: true };
}

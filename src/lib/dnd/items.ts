// ============================================
// OMA Quest — Gegenstände (Katalog im Code)
// ============================================
// Ausrüstung gibt einen Bonus auf Proben eines Attributs (kein Einfluss auf Battle Cards). Gegenstände ohne Bonus
// sind Handelsware/Fundstücke, die man verkaufen kann. Preise in Gold; Verkauf bringt die Hälfte.

import type { Ability } from "../te-map/rpg";

export type ItemSlot = "weapon" | "armor" | "trinket" | "loot" | "bait";

export interface ItemDef {
  key: string;
  name: string;
  emoji: string;
  slot: ItemSlot;
  desc: string;
  price: number;
  bonus?: { ability: Ability; value: number };
}

export const SLOT_LABEL: Record<ItemSlot, string> = { weapon: "Waffe", armor: "Rüstung", trinket: "Schmuck", loot: "Fundstück", bait: "Zähmköder" };

export const ITEMS: ItemDef[] = [
  { key: "rostschwert", name: "Rostiges Schwert", emoji: "🗡️", slot: "weapon", desc: "Sieht schlimmer aus, als es ist. Meistens.", price: 30, bonus: { ability: "str", value: 1 } },
  { key: "stahlschwert", name: "Stahlschwert", emoji: "⚔️", slot: "weapon", desc: "Ordentliche Klinge vom Schmied.", price: 120, bonus: { ability: "str", value: 2 } },
  { key: "dolch", name: "Schattendolch", emoji: "🔪", slot: "weapon", desc: "Leicht, leise, gemein.", price: 90, bonus: { ability: "dex", value: 2 } },
  { key: "zauberstab", name: "Knorriger Zauberstab", emoji: "🪄", slot: "weapon", desc: "Funkt gelegentlich.", price: 100, bonus: { ability: "int", value: 2 } },
  { key: "heilerstab", name: "Stab der Ruhe", emoji: "🌿", slot: "weapon", desc: "Beruhigt Tiere und Wirte.", price: 100, bonus: { ability: "wis", value: 2 } },
  { key: "lederruestung", name: "Lederrüstung", emoji: "🦺", slot: "armor", desc: "Riecht nach Abenteuer.", price: 60, bonus: { ability: "con", value: 1 } },
  { key: "kettenhemd", name: "Kettenhemd", emoji: "🛡️", slot: "armor", desc: "Schwer, aber verlässlich.", price: 160, bonus: { ability: "con", value: 2 } },
  { key: "reisemantel", name: "Reisemantel", emoji: "🧥", slot: "armor", desc: "Wetterfest und schick genug für Verhandlungen.", price: 70, bonus: { ability: "cha", value: 1 } },
  { key: "glueckstaler", name: "Glückstaler", emoji: "🍀", slot: "trinket", desc: "Fällt erstaunlich oft auf die richtige Seite.", price: 80, bonus: { ability: "cha", value: 1 } },
  { key: "eulenamulett", name: "Eulenamulett", emoji: "🦉", slot: "trinket", desc: "Man fühlt sich klüger. Vielleicht ist man es sogar.", price: 110, bonus: { ability: "int", value: 1 } },
  { key: "wanderstiefel", name: "Wanderstiefel", emoji: "🥾", slot: "trinket", desc: "Machen jeden Weg ein bisschen kürzer.", price: 75, bonus: { ability: "dex", value: 1 } },
  { key: "koeder-einfach", name: "Einfacher Zähmköder", emoji: "🍖", slot: "bait", desc: "Zähmt ein geschwächtes Monster (unter 25 % LP) mit 30 % Chance.", price: 40 },
  { key: "koeder-gut", name: "Guter Zähmköder", emoji: "🥩", slot: "bait", desc: "Zähmt ein geschwächtes Monster (unter 25 % LP) mit 55 % Chance.", price: 120 },
  { key: "koeder-meister", name: "Meister-Zähmköder", emoji: "🍯", slot: "bait", desc: "Zähmt ein geschwächtes Monster (unter 25 % LP) mit 80 % Chance.", price: 300 },
  { key: "bierkrug", name: "Zinnkrug", emoji: "🍺", slot: "loot", desc: "Leer. Wie immer.", price: 6 },
  { key: "silberloeffel", name: "Silberlöffel", emoji: "🥄", slot: "loot", desc: "Gehört garantiert jemandem.", price: 14 },
  { key: "alte-karte", name: "Vergilbte Karte", emoji: "🗺️", slot: "loot", desc: "Zeigt eine Insel, die es nicht gibt.", price: 20 },
  { key: "frachtbrief", name: "Frachtbrief", emoji: "📜", slot: "loot", desc: "Feucht, aber lesbar.", price: 10 },
  { key: "edelstein", name: "Funkelnder Edelstein", emoji: "💎", slot: "loot", desc: "Echt oder sehr gut gemacht.", price: 60 },
  { key: "sockenpaar", name: "Grün gestreiftes Sockenpaar", emoji: "🧦", slot: "loot", desc: "Selten und sehr warm.", price: 8 },
];

const BY_KEY = new Map(ITEMS.map((i) => [i.key, i]));
export const getItem = (key: string): ItemDef | undefined => BY_KEY.get(key);
export const isItemKey = (key: unknown): key is string => typeof key === "string" && BY_KEY.has(key);
export const sellPrice = (item: ItemDef): number => Math.max(1, Math.floor(item.price / 2));

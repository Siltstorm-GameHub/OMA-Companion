// ============================================
// Shop-Konfiguration (Glücksrad-Preise)
// ============================================
// Nutzt dieselbe BotConfig-Key-Value-Tabelle wie job-config/minigames-config
// — admin-editierbar über /admin/shop. (Karten-Packs gibt es seit dem Umbau von OMA Gems nicht mehr;
// alte Pack-Preise im Rad werden beim Laden ausgefiltert.)

import { prisma } from "./prisma";

export interface WheelPrize {
  id: string;
  type: "points" | "nothing";
  value: string;
  label: string;
  weight: number;
}

export interface ShopConfig {
  wheelPrizes: WheelPrize[];
}

const DEFAULT_WHEEL_PRIZES: WheelPrize[] = [
  { id: "p1", type: "points", value: "10", label: "10 Münzen", weight: 30 },
  { id: "p2", type: "points", value: "25", label: "25 Münzen", weight: 25 },
  { id: "p3", type: "points", value: "50", label: "50 Münzen", weight: 20 },
  { id: "p4", type: "points", value: "100", label: "100 Münzen", weight: 12 },
  { id: "p5", type: "points", value: "200", label: "200 Münzen ⭐", weight: 4 },
  { id: "p6", type: "points", value: "200", label: "200 Münzen", weight: 8 },
  { id: "p8", type: "nothing", value: "0", label: "Kein Glück", weight: 1 },
];

export const DEFAULTS: ShopConfig = {
  wheelPrizes: DEFAULT_WHEEL_PRIZES,
};

const KEYS = {
  wheelPrizes: "shop_wheel_prizes",
} as const;

/** Nur gültige Preise übernehmen (Münzen / Nichts) — z.B. alte Karten-Pack-Einträge fallen weg. */
function sanitizePrizes(input: unknown): WheelPrize[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (p): p is WheelPrize =>
      !!p && typeof p === "object" && (p.type === "points" || p.type === "nothing") &&
      typeof p.label === "string" && typeof p.id === "string" && Number(p.weight) > 0,
  ).map((p) => ({ id: p.id, type: p.type, value: String(p.value ?? "0"), label: p.label, weight: Number(p.weight) }));
}

export async function getShopConfig(): Promise<ShopConfig> {
  const row = await prisma.botConfig.findUnique({ where: { key: KEYS.wheelPrizes } });
  let wheelPrizes = DEFAULTS.wheelPrizes;
  if (row) {
    try {
      const parsed = sanitizePrizes(JSON.parse(row.value));
      if (parsed.length > 0) wheelPrizes = parsed;
    } catch {
      // kaputtes JSON in der DB — Defaults verwenden statt zu crashen
    }
  }
  return { wheelPrizes };
}

export async function updateShopConfig(patch: Partial<ShopConfig>): Promise<void> {
  if (patch.wheelPrizes === undefined) return;
  const value = JSON.stringify(sanitizePrizes(patch.wheelPrizes));
  await prisma.botConfig.upsert({ where: { key: KEYS.wheelPrizes }, create: { key: KEYS.wheelPrizes, value }, update: { value } });
}

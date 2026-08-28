// ============================================
// Shop-Konfiguration (Pack-Preis + Glücksrad-Preise)
// ============================================
// Nutzt dieselbe BotConfig-Key-Value-Tabelle wie job-config/mancave-config/
// minigames-config — admin-editierbar über /admin/shop.

import { prisma } from "./prisma";

export interface WheelPrize {
  id: string;
  type: "points" | "pack" | "nothing";
  value: string;
  label: string;
  weight: number;
}

export interface ShopConfig {
  packCost: number;
  wheelPrizes: WheelPrize[];
}

const DEFAULT_WHEEL_PRIZES: WheelPrize[] = [
  { id: "p1", type: "points", value: "10", label: "10 Münzen", weight: 30 },
  { id: "p2", type: "points", value: "25", label: "25 Münzen", weight: 25 },
  { id: "p3", type: "points", value: "50", label: "50 Münzen", weight: 20 },
  { id: "p4", type: "points", value: "100", label: "100 Münzen", weight: 12 },
  { id: "p5", type: "points", value: "200", label: "200 Münzen ⭐", weight: 4 },
  { id: "p6", type: "points", value: "200", label: "200 Münzen", weight: 8 },
  { id: "p7", type: "pack", value: "1", label: "Karten-Pack", weight: 3 },
  { id: "p8", type: "nothing", value: "0", label: "Kein Glück", weight: 1 },
];

export const DEFAULTS: ShopConfig = {
  packCost: 150,
  wheelPrizes: DEFAULT_WHEEL_PRIZES,
};

const KEYS = {
  packCost: "shop_pack_cost",
  wheelPrizes: "shop_wheel_prizes",
} as const;

export async function getShopConfig(): Promise<ShopConfig> {
  const rows = await prisma.botConfig.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const packCostRaw = map.get(KEYS.packCost);
  const packCost = packCostRaw ? parseInt(packCostRaw, 10) : DEFAULTS.packCost;

  const wheelPrizesRaw = map.get(KEYS.wheelPrizes);
  let wheelPrizes = DEFAULTS.wheelPrizes;
  if (wheelPrizesRaw) {
    try {
      const parsed = JSON.parse(wheelPrizesRaw);
      if (Array.isArray(parsed) && parsed.length > 0) wheelPrizes = parsed;
    } catch {
      // kaputtes JSON in der DB — Defaults verwenden statt zu crashen
    }
  }

  return {
    packCost: Number.isFinite(packCost) && packCost > 0 ? packCost : DEFAULTS.packCost,
    wheelPrizes,
  };
}

export async function updateShopConfig(patch: Partial<ShopConfig>): Promise<void> {
  const entries: [string, string][] = [];
  if (patch.packCost !== undefined) entries.push([KEYS.packCost, String(patch.packCost)]);
  if (patch.wheelPrizes !== undefined) entries.push([KEYS.wheelPrizes, JSON.stringify(patch.wheelPrizes)]);

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.botConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
}

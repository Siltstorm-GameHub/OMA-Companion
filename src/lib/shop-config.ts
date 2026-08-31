// ============================================
// Shop-Konfiguration (Pack-Preise je Sorte + Glücksrad-Preise)
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

export type PackKind = "STANDARD" | "PREMIUM" | "COMMUNITY";

export type PackPrices = Record<PackKind, number>;

export interface ShopConfig {
  packPrices: PackPrices;
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

const DEFAULT_PACK_PRICES: PackPrices = {
  STANDARD: 150,
  PREMIUM: 600,
  COMMUNITY: 2000,
};

export const DEFAULTS: ShopConfig = {
  packPrices: DEFAULT_PACK_PRICES,
  wheelPrizes: DEFAULT_WHEEL_PRIZES,
};

// "shop_pack_cost" ist der historische Key aus der Zeit vor mehreren
// Pack-Sorten — bleibt als Preis für STANDARD erhalten, damit ein bereits
// konfigurierter Preis nicht verloren geht.
const KEYS = {
  packCostStandard: "shop_pack_cost",
  packCostPremium: "shop_pack_cost_premium",
  packCostCommunity: "shop_pack_cost_community",
  wheelPrizes: "shop_wheel_prizes",
} as const;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function getShopConfig(): Promise<ShopConfig> {
  const rows = await prisma.botConfig.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const packPrices: PackPrices = {
    STANDARD: parsePositiveInt(map.get(KEYS.packCostStandard), DEFAULTS.packPrices.STANDARD),
    PREMIUM: parsePositiveInt(map.get(KEYS.packCostPremium), DEFAULTS.packPrices.PREMIUM),
    COMMUNITY: parsePositiveInt(map.get(KEYS.packCostCommunity), DEFAULTS.packPrices.COMMUNITY),
  };

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

  return { packPrices, wheelPrizes };
}

export async function updateShopConfig(patch: Partial<ShopConfig>): Promise<void> {
  const entries: [string, string][] = [];
  if (patch.packPrices?.STANDARD !== undefined) entries.push([KEYS.packCostStandard, String(patch.packPrices.STANDARD)]);
  if (patch.packPrices?.PREMIUM !== undefined) entries.push([KEYS.packCostPremium, String(patch.packPrices.PREMIUM)]);
  if (patch.packPrices?.COMMUNITY !== undefined) entries.push([KEYS.packCostCommunity, String(patch.packPrices.COMMUNITY)]);
  if (patch.wheelPrizes !== undefined) entries.push([KEYS.wheelPrizes, JSON.stringify(patch.wheelPrizes)]);

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.botConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
}

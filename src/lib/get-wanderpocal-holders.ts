import { prisma } from "@/lib/prisma";
import { buildHoldersMap, type WanderpocalHoldersMap } from "./wanderpocal";

/**
 * Server-side helper: fetch all current trophy holders and return a keyed map.
 * Call once per RSC page that renders player names.
 */
export async function getWanderpocalHoldersMap(): Promise<WanderpocalHoldersMap> {
  const rows = await prisma.wanderpocalHolder.findMany();
  return buildHoldersMap(rows);
}

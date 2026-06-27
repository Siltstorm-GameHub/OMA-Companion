"use client";
import Image from "next/image";
import { buildHoldersMap, CATEGORY_CONFIG, GENRE_CONFIG, getScopeTitle, type WanderpocalHolder } from "@/lib/wanderpocal";

interface Props {
  userId: string;
  /** Plain array (JSON-serializable) passed from server → client */
  holders: WanderpocalHolder[];
}

/**
 * Client-side inline trophy badge. Pass the holders array from the server page;
 * the map is built once per render. Renders the first trophy the user holds.
 */
export default function WanderpocalBadge({ userId, holders }: Props) {
  const map = buildHoldersMap(holders);
  const trophies = [...map.values()].filter((h) => h.userId === userId);
  if (!trophies.length) return null;

  const trophy = trophies.find((t) => t.scopeType === "category") ?? trophies[0];
  const title = `${getScopeTitle(trophy.scopeType, trophy.scopeValue)} (${trophy.winCount} ${trophy.winCount === 1 ? "Sieg" : "Siege"})`;

  if (trophy.scopeType === "category") {
    const cfg = CATEGORY_CONFIG[trophy.scopeValue];
    return (
      <span title={title} className="ml-1 text-amber-400 inline-flex items-center" aria-label={title}>
        {cfg?.emoji ?? "🏆"}
      </span>
    );
  }

  const cfg = GENRE_CONFIG[trophy.scopeValue];
  if (!cfg) return null;
  return (
    <span title={title} className="ml-1 inline-flex items-center" aria-label={title}>
      <Image src={cfg.icon} alt={title} width={16} height={16} className="inline" />
    </span>
  );
}

"use client";
import Image from "next/image";
import { buildHoldersMap, CATEGORY_CONFIG, GENRE_CONFIG, getScopeTitle, type WanderpocalHolder } from "@/lib/wanderpocal";

interface Props {
  userId: string;
  /** Plain array (JSON-serializable) passed from server → client */
  holders: WanderpocalHolder[];
}

/**
 * Client-side inline trophy badges. Shows up to 2 icons: one per category, one per genre.
 */
export default function WanderpocalBadge({ userId, holders }: Props) {
  const map = buildHoldersMap(holders);
  const all = [...map.values()].filter((h) => h.userId === userId);
  if (!all.length) return null;

  const category = all.find((t) => t.scopeType === "category");
  const genre    = all.find((t) => t.scopeType === "genre");
  const display  = [category, genre].filter(Boolean) as typeof all;

  return (
    <>
      {display.map((trophy) => {
        const title = `${getScopeTitle(trophy.scopeType, trophy.scopeValue)} (${trophy.winCount} ${trophy.winCount === 1 ? "Sieg" : "Siege"})`;
        if (trophy.scopeType === "category") {
          const cfg = CATEGORY_CONFIG[trophy.scopeValue];
          return (
            <span key={trophy.scopeValue} title={title} className="ml-1 text-amber-400 inline-flex items-center" aria-label={title}>
              {cfg?.emoji ?? "🏆"}
            </span>
          );
        }
        const cfg = GENRE_CONFIG[trophy.scopeValue];
        if (!cfg) return null;
        return (
          <span key={trophy.scopeValue} title={title} className="ml-1 inline-flex items-center" aria-label={title}>
            <Image src={cfg.icon} alt={title} width={16} height={16} className="inline" />
          </span>
        );
      })}
    </>
  );
}

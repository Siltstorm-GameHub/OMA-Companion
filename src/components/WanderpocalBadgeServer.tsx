import Image from "next/image";
import { CATEGORY_CONFIG, GENRE_CONFIG, getScopeTitle, type WanderpocalHoldersMap } from "@/lib/wanderpocal";

interface Props {
  userId: string;
  holdersMap: WanderpocalHoldersMap;
}

/**
 * Inline trophy badge for RSC pages. Renders the first trophy the user holds.
 * Category trophies show an emoji; genre trophies show the PNG icon.
 */
export default function WanderpocalBadgeServer({ userId, holdersMap }: Props) {
  const trophies = [...holdersMap.values()].filter((h) => h.userId === userId);
  if (!trophies.length) return null;

  // Prefer category trophy first, then genre
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

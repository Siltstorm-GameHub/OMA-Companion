import AppIcon from "./AppIcon";
import { EventCategory } from "@prisma/client";
import { normalizeCategory } from "@/lib/event-category";

const CATEGORY_CONFIG: Record<EventCategory, { label: string; emoji: string; className: string }> = {
  competitive:     { label: "Kompetitiv",  emoji: "🏆", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  fun:             { label: "Fun",         emoji: "🎉", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  casual:          { label: "Casual",      emoji: "🛋️", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  training:        { label: "Training",    emoji: "🎓", className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  community_event: { label: "Community",   emoji: "🤝", className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  special:         { label: "Special",     emoji: "⭐", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
};

export { ACTIVE_CATEGORIES, normalizeCategory } from "@/lib/event-category";

/** Reiner Text der Kategorie ("Kompetitiv") — für Meta-Zeilen ohne farbiges Badge. Altwerte → "Fun". */
export function categoryLabel(category: EventCategory | string | null | undefined): string | null {
  const c = normalizeCategory(category);
  return c ? CATEGORY_CONFIG[c].label : null;
}

export const CATEGORY_BORDER: Record<EventCategory, string> = {
  competitive:     "border-t-red-500",
  fun:             "border-t-amber-400",
  casual:          "border-t-amber-400", // Altwert → wie Fun
  training:        "border-t-indigo-500",
  community_event: "border-t-amber-400", // Altwert → wie Fun
  special:         "border-t-yellow-400",
};

export const CATEGORY_BG_TINT: Record<EventCategory, string> = {
  competitive:     "bg-red-950/20",
  fun:             "bg-amber-950/20",
  casual:          "bg-amber-950/20", // Altwert → wie Fun
  training:        "bg-indigo-950/20",
  community_event: "bg-amber-950/20", // Altwert → wie Fun
  special:         "bg-yellow-950/20",
};

interface Props {
  category: EventCategory;
  size?: "sm" | "md";
  className?: string;
}

export default function EventCategoryBadge({ category, size = "sm", className = "" }: Props) {
  const c = normalizeCategory(category) ?? "fun";
  const cfg = CATEGORY_CONFIG[c];
  const sizeClass = size === "md" ? "px-2.5 py-1 text-sm gap-1.5" : "px-2 py-0.5 text-xs gap-1";
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${cfg.className} ${className}`}>
      <AppIcon kind="category" name={c} size={size === "md" ? 18 : 14} />
      <span>{cfg.label}</span>
    </span>
  );
}

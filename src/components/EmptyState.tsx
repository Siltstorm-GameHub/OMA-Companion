import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Newspaper, ScrollText, Server, Sparkles, Trophy } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button-styles";

interface EmptyStateProps {
  type: "events" | "quests" | "feed" | "tournaments" | "leaderboard" | "gameserver" | "generic";
  title: string;
  description: string;
  action?: { label: string; href: string };
}

// Ruhige Symbol-Kachel statt bunter Illustrationen (Designentwurf: feste Flächen, keine Leucht-Farben)
const ICONS: Record<EmptyStateProps["type"], LucideIcon> = {
  events:      CalendarDays,
  quests:      ScrollText,
  feed:        Newspaper,
  tournaments: Trophy,
  leaderboard: Trophy,
  gameserver:  Server,
  generic:     Sparkles,
};

export function EmptyState({ type, title, description, action }: EmptyStateProps) {
  const Icon = ICONS[type];
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-12 text-center">
      <div className="flex flex-col items-center">
        <span className="mb-4 grid size-14 place-items-center rounded-card bg-primary-soft text-primary-fg">
          <Icon className="size-6" aria-hidden />
        </span>
        <p className="mb-1.5 text-base font-extrabold text-fg">{title}</p>
        <p className="mb-5 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
        {action && (
          <Link href={action.href} className={buttonClasses("primary", "lg")}>
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

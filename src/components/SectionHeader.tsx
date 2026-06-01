import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  href?: string;
  hrefLabel?: string;
  accent?: string; // Tailwind color class for the bar, e.g. "bg-rose-500"
}

export function SectionHeader({
  title,
  icon: Icon,
  href,
  hrefLabel = "Alle",
  accent = "bg-rose-500",
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <span className={`w-1 h-5 rounded-full ${accent} shrink-0`} />
        {Icon && <Icon className="w-4 h-4 text-gray-400 shrink-0" />}
        <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
      </div>
      {href && (
        <Link href={href}
          className="text-xs text-gray-500 hover:text-rose-400 flex items-center gap-0.5 transition-colors">
          {hrefLabel} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

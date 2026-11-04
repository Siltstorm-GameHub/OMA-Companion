"use client";
import { useState } from "react";
import Link from "next/link";
import { Award, ChevronDown, FileText, Images, Megaphone, Lightbulb, BookOpen } from "@/components/icons";
import { formatBerlinDate } from "@/lib/time";

export interface ProfileContribution {
  id: string;
  kind: "report" | "asset" | "marketing_post" | "idea" | "guide";
  title: string;
  href: string;
  meta: string | null;
  image: string | null;
  thumbs: number;
  date: string;
}

const TOP_COUNT = 3;

const KIND_META: Record<ProfileContribution["kind"], { label: string; icon: typeof FileText }> = {
  report: { label: "Bericht", icon: FileText },
  asset: { label: "Foto/Clip", icon: Images },
  marketing_post: { label: "Werbe-Post", icon: Megaphone },
  idea: { label: "Idee", icon: Lightbulb },
  guide: { label: "Anleitung", icon: BookOpen },
};

/** Liste der Profil-Beiträge: zuerst nur die Top 3 nach Daumen hoch, per Button alle. */
export default function ProfileContributionsList({ items, total }: { items: ProfileContribution[]; total: number }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, TOP_COUNT);
  const hidden = total - TOP_COUNT;

  return (
    <div className="glass rounded-2xl p-4 mb-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        <Award className="w-3.5 h-3.5 text-teal-400" />
        {showAll ? `Alle Beiträge (${total})` : "Beliebteste Beiträge"}
      </h2>
      <ul className="space-y-2">
        {visible.map(item => {
          const meta = KIND_META[item.kind];
          const Icon = meta.icon;
          const external = item.kind === "asset";
          const content = (
            <>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- Blob-Bilder beliebiger Größe
                <img src={item.image} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-black/30" />
              ) : (
                <span className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-teal-400" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-gray-200 truncate">{item.title}</span>
                <span className="block text-[11px] text-gray-500 truncate">
                  {meta.label}{item.meta ? ` · ${item.meta}` : ""} · {formatBerlinDate(item.date)}
                </span>
              </span>
              <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">{item.thumbs} 👍</span>
            </>
          );
          const cls = "flex items-center gap-3 hover:text-teal-400 transition-colors";
          return (
            <li key={item.id}>
              {external
                ? <a href={item.href} target="_blank" rel="noreferrer" className={cls}>{content}</a>
                : <Link href={item.href} className={cls}>{content}</Link>}
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-teal-300 border border-white/10 rounded-lg py-1.5 transition-colors">
          {showAll ? "Nur die Top 3 anzeigen" : `Alle ${total} Beiträge anzeigen`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

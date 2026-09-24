import Link from "next/link";
import { Lightbulb, Star } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { formatBerlinDate } from "@/lib/time";
import { ideaLifecycleMeta, summarizeStars } from "@/lib/idea-lifecycle";

/** Server-Komponente: Ideen-Portfolio eines Users (Status + Bewertung), z.B. auf dem Profil. */

export async function IdeaPortfolio({ userId }: { userId: string }) {
  const ideas = await prisma.communityIdea.findMany({
    where: { authorId: userId, hiddenByAdminAt: null }, orderBy: { createdAt: "desc" }, take: 12,
    select: { id: true, title: true, createdAt: true, lifecycle: true, votes: { select: { stars: true } } },
  });
  if (ideas.length === 0) return null;
  const done = ideas.filter(i => i.lifecycle === "DONE").length;

  return (
    <div className="glass rounded-2xl p-4 mb-5 space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Ideen ({ideas.length}){done > 0 ? ` · ${done} umgesetzt` : ""}
      </h2>
      <ul className="space-y-1.5">
        {ideas.map(i => {
          const { count, average } = summarizeStars(i.votes.map(v => v.stars));
          const meta = ideaLifecycleMeta(i.lifecycle);
          return (
            <li key={i.id}>
              <Link href={`/community-board/idea/${i.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-teal-400 transition-colors">
                <span className="min-w-0 truncate text-gray-200">
                  {i.title}
                  {i.lifecycle !== "OPEN" && <span className={`ml-2 text-[10px] ${i.lifecycle === "DONE" ? "text-emerald-400" : "text-gray-500"}`}>{i.lifecycle === "DONE" ? "✓ " : ""}{meta.label}</span>}
                </span>
                <span className="shrink-0 text-[11px] text-gray-500 flex items-center gap-1">
                  {count > 0 ? <>{average.toFixed(1)}<Star className="w-3 h-3 text-amber-400 fill-amber-400" /> · {count}</> : "–"} · {formatBerlinDate(i.createdAt, { day: "2-digit", month: "2-digit" })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

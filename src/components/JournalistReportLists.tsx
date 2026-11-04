import Link from "next/link";
import { FileText } from "@/components/icons";
import { prisma } from "@/lib/prisma";

/** Server-Komponente: veröffentlichte Journalisten-Berichte zu einem Event (Profil: siehe ProfileTopContributions). */

const VISIBLE = { isDraft: false, hiddenByAdminAt: null } as const;

export async function EventReportsSection({ eventId }: { eventId: string }) {
  const reports = await prisma.jobReport.findMany({
    where: { eventId, ...VISIBLE },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: {
      id: true, title: true, category: true, publishedAt: true,
      author: { select: { username: true, name: true } },
      _count: { select: { votes: true } },
    },
  });
  if (reports.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 mb-5 space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-teal-400" /> Berichte zu diesem Event
      </h2>
      <ul className="space-y-1.5">
        {reports.map(r => (
          <li key={r.id}>
            <Link href={`/community-board/report/${r.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-teal-400 transition-colors">
              <span className="min-w-0 truncate text-gray-200">{r.title}</span>
              <span className="shrink-0 text-[11px] text-gray-500">
                {r.author.username ?? r.author.name ?? "?"} · {r._count.votes} 👍
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

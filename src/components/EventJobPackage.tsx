import Link from "next/link";
import { Users } from "lucide-react";
import { Check } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getActiveMembership } from "@/lib/community-job-service";
import { getCommunityJob } from "@/lib/community-jobs";

/**
 * "Event-Team": Übersicht auf der Turnierseite, welche Community-Jobs sich schon um dieses Event gekümmert haben
 * und was noch fehlt — vor dem Event Werbung/Training/Fotos, danach Bericht/Fotos/Idee. Wer den passenden Job hat,
 * sieht, wo sein Beitrag noch fehlt.
 */

interface Row { jobKey: string; what: string; count: number; names: string[] }

const nameOf = (u: { username: string | null; name: string | null }) => u.username ?? u.name ?? "?";
const uniqueNames = (names: string[]) => [...new Set(names)].slice(0, 3);

export default async function EventJobPackage({ eventId }: { eventId: string }) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, status: true, startAt: true, hidden: true } });
  if (!event || event.hidden) return null;
  const finished = event.status === "finished";
  const visible = { hiddenByAdminAt: null };
  const author = { select: { username: true, name: true } } as const;

  const [posts, assets, reports, ideas, sessions, user] = await Promise.all([
    prisma.marketingPost.findMany({ where: { eventId, ...visible }, select: { author } }),
    prisma.jobMediaAsset.findMany({ where: { eventId, ...visible }, select: { author } }),
    prisma.jobReport.findMany({ where: { eventId, isDraft: false, ...visible }, select: { author } }),
    prisma.communityIdea.findMany({ where: { sourceEventId: eventId, ...visible }, select: { author } }),
    prisma.coachTrainingSession.findMany({ where: { eventId }, select: { coach: author } }),
    getSessionUser(),
  ]);
  const membership = user ? await getActiveMembership(user.id) : null;

  const rows: Row[] = finished
    ? [
        { jobKey: "journalist", what: "Bericht", count: reports.length, names: uniqueNames(reports.map(r => nameOf(r.author))) },
        { jobKey: "fotograf", what: "Fotos & Clips", count: assets.length, names: uniqueNames(assets.map(a => nameOf(a.author))) },
        { jobKey: "visionaer", what: "Idee für das Nächste", count: ideas.length, names: uniqueNames(ideas.map(i => nameOf(i.author))) },
      ]
    : [
        { jobKey: "marketing_manager", what: "Werbung", count: posts.length, names: uniqueNames(posts.map(p => nameOf(p.author))) },
        { jobKey: "coach", what: "Vorbereitungs-Training", count: sessions.length, names: uniqueNames(sessions.map(s => nameOf(s.coach))) },
        { jobKey: "fotograf", what: "Fotos & Clips", count: assets.length, names: uniqueNames(assets.map(a => nameOf(a.author))) },
        { jobKey: "visionaer", what: "Idee dazu", count: ideas.length, names: uniqueNames(ideas.map(i => nameOf(i.author))) },
      ];

  const missing = rows.filter(r => r.count === 0).length;
  return (
    <div className="glass rounded-2xl p-4 mb-5 space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-teal-400" /> Community-Team zu diesem Event
        <span className="ml-auto normal-case tracking-normal text-[11px] text-gray-500">{missing === 0 ? "alles abgedeckt" : `${missing} ${missing === 1 ? "Aufgabe" : "Aufgaben"} offen`}</span>
      </h2>
      <ul className="space-y-1.5">
        {rows.map(r => {
          const job = getCommunityJob(r.jobKey);
          const mine = membership?.jobKey === r.jobKey;
          return (
            <li key={r.jobKey} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span aria-hidden="true">{job?.emoji}</span>
                <span className="text-gray-200 truncate">{r.what}</span>
                {mine && <span className="shrink-0 text-[10px] text-teal-300 border border-teal-500/30 rounded-full px-1.5">dein Job</span>}
              </span>
              <span className="shrink-0 text-[11px] flex items-center gap-1.5">
                {r.count > 0
                  ? <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />{r.count}× · {r.names.join(", ")}</span>
                  : mine
                    ? <Link href="/profile" className="text-amber-400 hover:text-amber-300 transition-colors">fehlt noch — im Büro übernehmen →</Link>
                    : <span className="text-amber-400/90">fehlt noch</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

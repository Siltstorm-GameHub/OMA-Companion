import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Crown, Users, EyeOff, CalendarDays, Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import SeriesIcon from "@/components/SeriesIcon";
import SquadRosterManager from "@/components/squads/SquadRosterManager";

const EVENT_STATUS_LABEL: Record<string, string> = {
  open: "Offen", active: "Läuft", closed: "Voll", umfrage: "Umfragephase", finished: "Beendet",
};

const userName = (u: { name: string | null; username: string | null }) => u.username ?? u.name ?? "?";

function Avatar({ u }: { u: { name: string | null; username: string | null; image: string | null } }) {
  if (u.image) return <img src={u.image} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-400 shrink-0">
      {userName(u)[0]?.toUpperCase()}
    </div>
  );
}

export default async function SquadPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [squad, me] = await Promise.all([
    prisma.squad.findUnique({
      where: { id },
      include: {
        memberships: {
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          include: { user: { select: { id: true, name: true, username: true, image: true } } },
        },
      },
    }),
    getSessionUser(),
  ]);
  if (!squad) notFound();

  const isModerator = !!me && hasMinRole(me.role, "moderator");
  const isCaptain = !!me && squad.memberships.some(m => m.userId === me.id && m.role === "captain");
  // Wer das Roster/die Events verwalten darf (Moderator/Admin oder Captain dieses Squads) sieht auch
  // noch unveröffentlichte (hidden) Events der eigenen Squad — alle anderen Betrachter nicht.
  const canManage = isModerator || isCaptain;

  const [squadEvents, allUsers] = await Promise.all([
    prisma.event.findMany({
      where: { ...(!canManage && { hidden: false }), OR: [{ squadId: id }, { series: { squadId: id } }] },
      orderBy: { startAt: "desc" },
      take: 20,
      select: { id: true, title: true, startAt: true, status: true, game: true, hidden: true },
    }),
    canManage
      ? prisma.user.findMany({
          select: { id: true, name: true, username: true, image: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const upcomingEvents = squadEvents.filter(e => e.status !== "finished").sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const finishedEvents = squadEvents.filter(e => e.status === "finished");

  return (
    <div className="px-4 sm:px-6 py-5 max-w-3xl mx-auto space-y-5">
      <Link href="/squads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Squads
      </Link>

      {squad.coverImageUrl ? (
        <div className="relative h-36 sm:h-44 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- externe Blob-URL, siehe ImageUploadField-Konvention */}
          <img src={squad.coverImageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,13,15,0.92), rgba(13,13,15,0.15) 60%)" }} />
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
            <SeriesIcon name={squad.icon} className="w-7 h-7 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-black text-white truncate">{squad.name}</h1>
              {squad.game && <p className="text-sm text-gray-300">{squad.game}</p>}
            </div>
            {squad.hidden && (
              <span className="flex items-center gap-1 text-[10px] text-gray-300 ml-auto shrink-0">
                <EyeOff className="w-3 h-3" /> ausgeblendet
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <SeriesIcon name={squad.icon} className="w-8 h-8 shrink-0" />
          <div>
            <h1 className="text-xl font-black text-white">{squad.name}</h1>
            {squad.game && <p className="text-sm text-gray-500">{squad.game}</p>}
          </div>
          {squad.hidden && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500 ml-auto">
              <EyeOff className="w-3 h-3" /> ausgeblendet
            </span>
          )}
        </div>
      )}

      {squad.description && (
        <p className="text-sm text-gray-400 leading-relaxed">{squad.description}</p>
      )}

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Roster ({squad.memberships.length})
        </p>

        {canManage ? (
          <SquadRosterManager squadId={squad.id} memberships={squad.memberships} allUsers={allUsers} />
        ) : (
          <div className="space-y-1.5">
            {squad.memberships.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <Avatar u={m.user} />
                <span className="text-sm text-white flex-1 truncate">{userName(m.user)}</span>
                {m.role === "captain" && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 shrink-0">
                    <Crown className="w-3 h-3" /> Captain
                  </span>
                )}
              </div>
            ))}
            {squad.memberships.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-4">Noch keine Mitglieder.</p>
            )}
          </div>
        )}
      </div>

      {(squadEvents.length > 0 || canManage) && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Events
            </p>
            {canManage && (
              <Link href={`/admin/events/new?squadId=${squad.id}`}
                className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 transition-colors">
                <Plus className="w-3 h-3" /> Neues Event
              </Link>
            )}
          </div>
          <div className="space-y-1.5">
            {[...upcomingEvents, ...finishedEvents].map(e => (
              <div key={e.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/20 transition-colors">
                <Link href={`/tournament/${e.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm text-white flex-1 truncate">{e.title}</span>
                  {e.game && <span className="text-xs text-gray-500 shrink-0">{e.game}</span>}
                  <span className="text-xs text-gray-600 shrink-0 tabular-nums">
                    {new Date(e.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-400 shrink-0">
                    {e.hidden ? "Ausgeblendet" : EVENT_STATUS_LABEL[e.status] ?? e.status}
                  </span>
                </Link>
                {canManage && (
                  <Link href={`/admin/events/${e.id}`} title="Bearbeiten"
                    className="p-1.5 rounded text-gray-600 hover:text-teal-400 transition-colors shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
            {squadEvents.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-4">Noch keine Events.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { Users } from "@/components/icons";
import { ChevronLeft } from "@/components/icons";
import { Crown, EyeOff, CalendarDays, Plus, Pencil } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import SeriesIcon from "@/components/SeriesIcon";
import SquadRosterManager from "@/components/squads/SquadRosterManager";
import { formatBerlinDate } from "@/lib/time";
import { getGameListInfo } from "@/lib/games/service";
import GameListInfo from "@/components/games/GameListInfo";

const EVENT_STATUS_LABEL: Record<string, string> = {
  open: "Offen", active: "Läuft", closed: "Voll", umfrage: "Umfragephase", finished: "Beendet", cancelled: "Fällt aus",
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
  const gameInfo = squad.game ? await getGameListInfo(squad.game) : null;

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
    <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-6">
      <Link href="/squads" className="inline-flex min-h-9 items-center gap-1 text-sm text-muted hover:text-fg transition-colors">
        <ChevronLeft className="w-4 h-4" /> Squads
      </Link>

      {/* Kopf: Banner (Cover oder ruhige Fläche) mit Squad-Logo, Name und Spiel */}
      <section aria-label={squad.name} className="relative overflow-hidden rounded-card border border-line bg-surface">
        <div className="relative h-36 sm:h-48 bg-surface-2">
          {squad.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- externe Blob-URL, siehe ImageUploadField-Konvention
            <img src={squad.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
        </div>
        <div className="relative -mt-10 flex items-end gap-4 px-4 pb-4 sm:px-6 sm:pb-5">
          <span className="grid size-20 shrink-0 place-items-center rounded-card border-4 border-surface bg-surface-2">
            <SeriesIcon name={squad.icon} className="w-10 h-10" />
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg truncate">{squad.name}</h1>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
              {squad.game && <span>{squad.game}</span>}
              <span>{squad.memberships.length} {squad.memberships.length === 1 ? "Mitglied" : "Mitglieder"}</span>
              {squad.hidden && <span className="inline-flex items-center gap-1 text-subtle"><EyeOff className="w-3.5 h-3.5" /> ausgeblendet</span>}
            </p>
          </div>
        </div>
      </section>

      {gameInfo && <GameListInfo info={gameInfo} />}

      {squad.description && (
        <p className="text-base text-muted leading-relaxed max-w-3xl">{squad.description}</p>
      )}

      <section aria-label="Roster" className="space-y-3">
        <h2 className="text-base font-extrabold text-fg flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-fg" /> Roster <span className="text-sm font-semibold text-subtle">{squad.memberships.length}</span>
        </h2>

        {canManage ? (
          <SquadRosterManager squadId={squad.id} memberships={squad.memberships} allUsers={allUsers} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {squad.memberships.map(m => (
              <Link key={m.id} href={`/profile/${m.user.id}`} className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 hover:border-line-strong hover:bg-surface-2 transition-colors">
                <Avatar u={m.user} />
                <span className="text-sm font-bold text-fg flex-1 truncate">{userName(m.user)}</span>
                {m.role === "captain" && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 shrink-0">
                    <Crown className="w-3.5 h-3.5" /> Captain
                  </span>
                )}
              </Link>
            ))}
            {squad.memberships.length === 0 && (
              <p className="text-sm text-muted text-center py-4 col-span-full">Noch keine Mitglieder.</p>
            )}
          </div>
        )}
      </section>

      {(squadEvents.length > 0 || canManage) && (
        <section aria-label="Events" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-fg flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary-fg" /> Events
            </h2>
            {canManage && (
              <Link href={`/events/verwalten/neu?squadId=${squad.id}`}
                className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary-fg hover:text-fg transition-colors">
                <Plus className="w-4 h-4" /> Neues Event
              </Link>
            )}
          </div>
          <div className="rounded-card border border-line bg-surface divide-y divide-line overflow-hidden">
            {[...upcomingEvents, ...finishedEvents].map(e => (
              <div key={e.id}
                className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors">
                <Link href={`/tournament/${e.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm font-semibold text-fg flex-1 truncate">{e.title}</span>
                  {e.game && <span className="text-xs text-gray-500 shrink-0">{e.game}</span>}
                  <span className="text-xs text-gray-600 shrink-0 tabular-nums">
                    {formatBerlinDate(e.startAt, { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-line text-gray-400 shrink-0">
                    {e.hidden ? "Ausgeblendet" : EVENT_STATUS_LABEL[e.status] ?? e.status}
                  </span>
                </Link>
                {canManage && (
                  <Link href={`/events/verwalten/${e.id}`} title="Bearbeiten"
                    className="p-1.5 rounded text-gray-600 hover:text-primary transition-colors shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
            {squadEvents.length === 0 && (
              <p className="text-sm text-muted text-center py-4">Noch keine Events.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

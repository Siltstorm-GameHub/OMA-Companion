import Link from "next/link";
import { Crown, Users } from "@/components/icons";
import { Glyph } from "@/components/ui/Glyph";
import { resolveSeriesColor } from "@/lib/series-icons";
import { prisma } from "@/lib/prisma";
import SeriesIcon from "@/components/SeriesIcon";
import { EmptyState } from "@/components/EmptyState";

export default async function SquadsList() {
  const squads = await prisma.squad.findMany({
    where: { hidden: false },
    orderBy: { name: "asc" },
    include: {
      memberships: {
        where: { role: "captain" },
        take: 3,
        include: { user: { select: { id: true, name: true, username: true } } },
      },
      _count: { select: { memberships: true } },
    },
  });

  return (
    <>
      {squads.length === 0 ? (
        <EmptyState type="generic" title="Noch keine Squads" description="Es wurden noch keine Squads angelegt." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {squads.map(s => {
            const color = resolveSeriesColor(s.icon);
            const captains = s.memberships.map(m => m.user.username ?? m.user.name ?? "?");
            return (
              <Link key={s.id} href={`/squads/${s.id}`}
                className="group overflow-hidden rounded-card border border-line bg-surface shadow-card transition-colors hover:border-line-strong">
                {/* Cover; ohne Bild eine Fläche in der Squad-Farbe mit großem Symbol — so sind alle Kacheln gleich hoch */}
                <div className="relative h-24 overflow-hidden">
                  {s.coverImageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- externe Blob-URL, siehe ImageUploadField-Konvention */}
                      <img src={s.coverImageUrl} alt="" className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--color-surface) 80%, transparent), transparent 70%)" }} />
                    </>
                  ) : (
                    <div className="grid h-full place-items-center" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 22%, var(--color-surface-2)), var(--color-surface-2))` }}>
                      <SeriesIcon name={s.icon} className="size-10 opacity-80" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 p-4">
                  <div className="flex items-center gap-2">
                    <SeriesIcon name={s.icon} className="size-5 shrink-0" />
                    <p className="text-base font-extrabold text-fg truncate group-hover:text-primary-fg transition-colors">{s.name}</p>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-subtle">
                    {s.game && <><Glyph name="gamepad" className="size-3.5" /><span className="truncate">{s.game}</span><span aria-hidden>·</span></>}
                    <Users className="size-3.5 shrink-0" /> {s._count.memberships} {s._count.memberships === 1 ? "Mitglied" : "Mitglieder"}
                  </p>
                  {captains.length > 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-muted truncate">
                      <Crown className="size-3.5 shrink-0 text-coin" />
                      <span className="truncate">{captains.join(", ")}</span>
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { Users, Crown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import SeriesIcon from "@/components/SeriesIcon";
import { EmptyState } from "@/components/EmptyState";

export default async function SquadsPage() {
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
    <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black text-white">Squads</h1>
        <p className="text-sm text-gray-400 mt-1">
          Unsere persistenten eSports-Teams — Roster, Captains und zugehörige Events.
        </p>
      </div>

      {squads.length === 0 ? (
        <EmptyState type="generic" title="Noch keine Squads" description="Es wurden noch keine Squads angelegt." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {squads.map(s => (
            <Link key={s.id} href={`/squads/${s.id}`}
              className="rounded-xl p-4 border border-white/[0.08] bg-white/[0.02] hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <SeriesIcon name={s.icon} className="w-5 h-5 shrink-0" />
                <p className="text-sm font-semibold text-white truncate">{s.name}</p>
              </div>
              {s.game && <p className="text-xs text-gray-500 mb-2">{s.game}</p>}
              <p className="text-xs text-gray-600 flex items-center gap-1 mb-2">
                <Users className="w-3 h-3" /> {s._count.memberships} Mitglieder
              </p>
              {s.memberships.length > 0 && (
                <p className="text-xs text-amber-400/80 flex items-center gap-1 truncate">
                  <Crown className="w-3 h-3 shrink-0" />
                  {s.memberships.map(m => m.user.username ?? m.user.name ?? "?").join(", ")}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import SquadsListClient from "./SquadsListClient";

// Nur Moderatoren/Admins (blanket-gated über admin/layout.tsx) — Captains verwalten ihr Roster
// stattdessen direkt auf der öffentlichen Squad-Seite (/squads/[id]), nicht hier im Admin-Bereich.
export default async function AdminSquadsPage() {
  const user = await requireRole("moderator");

  const squads = await prisma.squad.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Squads</h1>
        <p className="text-sm text-gray-400 mt-1">
          Persistente eSports-Teams (z.B. „Rocket League Team") — Mitglieder können in mehreren Squads
          gleichzeitig sein. Captains verwalten das Roster ihres eigenen Squads direkt auf der
          öffentlichen Squad-Seite.
        </p>
      </div>
      <SquadsListClient squads={squads} isAdmin={user.role === "admin"} />
    </div>
  );
}

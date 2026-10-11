import { prisma } from "@/lib/prisma";
import { requireModeratorOrAnySquadCaptain } from "@/lib/roles";
import EventSetupWizard from "./EventSetupWizard";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; squadId?: string }>;
}) {
  const { captainedSquadIds } = await requireModeratorOrAnySquadCaptain();
  const { mode, squadId: initialSquadId } = await searchParams;
  // Captains dürfen nur an ihre eigenen Squad(s) gebundene Events/Reihen anlegen — kein "für alle
  // offen" und keine Verknüpfung mit fremden Reihen.
  const squadFilter = captainedSquadIds ? { in: captainedSquadIds } : undefined;

  const [series, squads] = await Promise.all([
    prisma.eventSeries.findMany({
      where: { status: "active", ...(squadFilter && { squadId: squadFilter }) },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        genre: true,
        placementRewardsJson: true,
        _count: { select: { events: true } },
      },
    }),
    prisma.squad.findMany({
      where: { hidden: false, ...(squadFilter && { id: squadFilter }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <EventSetupWizard
      series={series}
      squads={squads}
      forceSquad={captainedSquadIds !== null}
      initialSquadId={initialSquadId}
      initialMode={mode === "series" ? "series" : "select"}
    />
  );
}

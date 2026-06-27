import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import EventSetupWizard from "./EventSetupWizard";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  await requireRole("moderator");
  const { mode } = await searchParams;

  const series = await prisma.eventSeries.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      genre: true,
      placementRewardsJson: true,
      _count: { select: { events: true } },
    },
  });

  return (
    <EventSetupWizard
      series={series}
      initialMode={mode === "series" ? "series" : "select"}
    />
  );
}

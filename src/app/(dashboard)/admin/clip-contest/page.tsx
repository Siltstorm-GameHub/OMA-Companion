import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import ContestManager from "./ContestManager";
import CreateContestForm from "./CreateContestForm";

export default async function AdminClipContestPage() {
  await requireRole("moderator");

  const [contests, partners] = await Promise.all([
    prisma.monthlyClipContest.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        nominations: {
          include: {
            submittedBy: { select: { id: true, name: true, username: true } },
            _count: { select: { votes: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { votes: true } },
      },
    }),
    prisma.partner.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { twitchLogin: true },
    }),
  ]);

  const hasActiveContest = contests.some((c) => c.status === "voting");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-white">Clip des Monats – Contests</h1>
      <CreateContestForm
        defaultChannels={partners.map((p) => p.twitchLogin)}
        hasActiveContest={hasActiveContest}
      />
      <ContestManager contests={contests} />
    </div>
  );
}

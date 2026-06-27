import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import ContestManager from "./ContestManager";

export default async function AdminClipContestPage() {
  await requireRole("moderator");

  const contests = await prisma.monthlyClipContest.findMany({
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
  });

  return <ContestManager contests={contests} />;
}

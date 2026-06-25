import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { DailyMessagePanel } from "./DailyMessagePanel";

export default async function DailyMessageAdminPage() {
  await requireRole("moderator");

  const messages = await prisma.dailyMessage.findMany({
    orderBy: { createdAt: "desc" },
    include: { creator: { select: { username: true, name: true } } },
  });

  const serialized = messages.map(m => ({
    ...m,
    startDate: m.startDate.toISOString(),
    endDate:   m.endDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return <DailyMessagePanel messages={serialized} />;
}

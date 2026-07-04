import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { DailyMessagePanel } from "./DailyMessagePanel";

export default async function DailyMessageAdminPage() {
  await requireRole("admin");

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

  return (
    <div className="space-y-10 max-w-3xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          📢 Mitteilungen (Banner)
        </h2>
        <DailyMessagePanel messages={serialized} />
      </section>
    </div>
  );
}

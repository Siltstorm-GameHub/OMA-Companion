import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { DailyMessagePanel } from "./DailyMessagePanel";
import { DailyPollPanel } from "./DailyPollPanel";

export default async function DailyMessageAdminPage() {
  await requireRole("admin");

  const [messages, polls] = await Promise.all([
    prisma.dailyMessage.findMany({
      orderBy: { createdAt: "desc" },
      include: { creator: { select: { username: true, name: true } } },
    }),
    prisma.dailyPoll.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { username: true, name: true } },
        options: { orderBy: { order: "asc" } },
        votes:   {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, username: true, name: true, image: true } } },
        },
      },
    }),
  ]);

  const serialized = messages.map(m => ({
    ...m,
    startDate: m.startDate.toISOString(),
    endDate:   m.endDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  const serializedPolls = polls.map(p => ({
    ...p,
    startDate: p.startDate.toISOString(),
    endDate:   p.endDate.toISOString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    votes: p.votes.map(v => ({ ...v, createdAt: v.createdAt.toISOString() })),
  }));

  return (
    <div className="space-y-10 max-w-3xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          📢 Mitteilungen (Banner)
        </h2>
        <DailyMessagePanel messages={serialized} />
      </section>
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🗳️ Umfragen (Banner)
        </h2>
        <DailyPollPanel polls={serializedPolls} />
      </section>
    </div>
  );
}

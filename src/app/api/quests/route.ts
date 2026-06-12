import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { generateMonthlyQuests } from "@/lib/quests";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = me.id;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Auto-generate if none exist for this month
  await generateMonthlyQuests(month, year);

  const quests = await prisma.quest.findMany({
    where: { month, year },
    include: {
      progress: { where: { userId } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(quests);
}

// Admin: force-regenerate (deletes existing, creates new)
export async function POST() {
  const me = await getSessionUser();
  if (me?.role !== "admin" && me?.role !== "moderator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Delete existing quests for this month (cascade deletes progress)
  const existing = await prisma.quest.findMany({ where: { month, year }, select: { id: true } });
  if (existing.length) {
    await prisma.userQuestProgress.deleteMany({
      where: { questId: { in: existing.map((q) => q.id) } },
    });
    await prisma.quest.deleteMany({ where: { month, year } });
  }

  const quests = await generateMonthlyQuests(month, year);
  return NextResponse.json(quests, { status: 201 });
}

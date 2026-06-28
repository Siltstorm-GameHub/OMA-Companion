import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";

export async function POST() {
  const me = await getSessionUser();
  if (!me || (me.role !== "admin" && me.role !== "moderator")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { rankPoints: "desc" },
    take: 50,
    select: { id: true },
  });

  const dataJson = JSON.stringify(
    Object.fromEntries(users.map((u, i) => [u.id, i + 1]))
  );

  const snapshot = await prisma.leaderboardRankSnapshot.create({
    data: { dataJson },
  });

  // Keep only the 5 most recent snapshots
  const old = await prisma.leaderboardRankSnapshot.findMany({
    orderBy: { takenAt: "desc" },
    skip: 5,
    select: { id: true },
  });
  if (old.length > 0) {
    await prisma.leaderboardRankSnapshot.deleteMany({
      where: { id: { in: old.map(o => o.id) } },
    });
  }

  return NextResponse.json({ ok: true, id: snapshot.id, takenAt: snapshot.takenAt });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: serverId } = await params;

  const applications = await prisma.serverApplication.findMany({
    where: { serverId },
    orderBy: { appliedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  return NextResponse.json(applications);
}

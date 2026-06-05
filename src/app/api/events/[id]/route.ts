import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: { select: { registrations: true } },
      tournament: {
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
          },
          matches: {
            orderBy: [{ round: "asc" }, { position: "asc" }],
            include: { entries: true },
          },
        },
      },
    },
  });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(event);
}

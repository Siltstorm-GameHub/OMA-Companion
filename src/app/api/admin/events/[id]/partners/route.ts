import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: eventId } = await params;
  const { partnerIds } = (await req.json()) as { partnerIds: string[] };

  await prisma.$transaction([
    prisma.eventPartner.deleteMany({ where: { eventId } }),
    ...(partnerIds.length > 0
      ? [prisma.eventPartner.createMany({
          data: partnerIds.map((partnerId) => ({ eventId, partnerId })),
        })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = (await req.json()) as { name?: string; twitchLogin?: string; logoUrl?: string; isActive?: boolean; order?: number; userId?: string | null };
  const { userId, ...rest } = body;
  const partner = await prisma.partner.update({
    where: { id },
    data: {
      ...rest,
      ...(userId !== undefined && { userId: userId || null }),
    },
    include: { user: { select: { id: true, name: true, username: true, image: true, twitchLogin: true } } },
  });
  return NextResponse.json(partner);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  await prisma.partner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

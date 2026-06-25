import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireRole("moderator");
  const { id } = await params;

  const body = await req.json() as {
    title?: string;
    content?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  };

  const { title, content, startDate, endDate, isActive } = body;

  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    return NextResponse.json({ error: "Enddatum muss nach dem Startdatum liegen" }, { status: 400 });
  }

  const message = await prisma.dailyMessage.update({
    where: { id },
    data: {
      ...(title     && { title: title.trim() }),
      ...(content   && { content: content.trim() }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate   && { endDate: new Date(endDate) }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(message);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireRole("moderator");
  const { id } = await params;
  await prisma.dailyMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

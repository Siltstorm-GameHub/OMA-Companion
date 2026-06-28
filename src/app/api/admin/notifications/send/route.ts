import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  await requireRole("admin");

  const body = await req.json() as {
    userIds?: string[];
    all?: boolean;
    title?: string;
    body?: string;
    url?: string;
  };

  const { userIds, all, title, url } = body;
  const messageBody = body.body;

  if (!title?.trim() || !messageBody?.trim()) {
    return NextResponse.json({ error: "Titel und Text sind Pflichtfelder" }, { status: 400 });
  }

  let targetIds: string[] = [];

  if (all) {
    const users = await prisma.user.findMany({ select: { id: true } });
    targetIds = users.map((u) => u.id);
  } else if (userIds?.length) {
    targetIds = userIds;
  } else {
    return NextResponse.json({ error: "Kein Empfänger angegeben" }, { status: 400 });
  }

  await prisma.inAppNotification.createMany({
    data: targetIds.map((userId) => ({
      userId,
      type: "admin",
      title: title.trim(),
      body: messageBody.trim(),
      url: url?.trim() || null,
    })),
  });

  return NextResponse.json({ ok: true, sent: targetIds.length });
}

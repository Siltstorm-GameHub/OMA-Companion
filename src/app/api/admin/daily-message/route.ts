import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";
import { sendDiscordDMToAll } from "@/lib/notify-dispatch";

export async function GET() {
  await requireRole("admin");
  const messages = await prisma.dailyMessage.findMany({
    orderBy: { createdAt: "desc" },
    include: { creator: { select: { username: true, name: true } } },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const user = await requireRole("admin");

  const body = await req.json() as {
    title?: string;
    content?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    sendPush?: boolean;
  };

  const { title, content, startDate, endDate, isActive = true, sendPush = false } = body;

  if (!title?.trim() || !content?.trim() || !startDate || !endDate) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }
  if (new Date(endDate) <= new Date(startDate)) {
    return NextResponse.json({ error: "Enddatum muss nach dem Startdatum liegen" }, { status: 400 });
  }

  const message = await prisma.dailyMessage.create({
    data: {
      title:     title.trim(),
      content:   content.trim(),
      startDate: new Date(startDate),
      endDate:   new Date(endDate),
      isActive,
      createdBy: user.id,
    },
  });

  if (sendPush && isActive) {
    const pushTitle = `📢 ${title.trim()}`;
    const pushBody  = content.trim().slice(0, 120);
    sendPushToAll({ title: pushTitle, body: pushBody, url: "/dashboard" }).catch(() => {});
    sendDiscordDMToAll({ title: pushTitle, description: pushBody, url: "/dashboard", color: 0x2dd4bf }).catch(() => {});
  }

  return NextResponse.json(message, { status: 201 });
}

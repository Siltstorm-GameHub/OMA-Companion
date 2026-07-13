import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";
import { sendDiscordDMToAll } from "@/lib/notify-dispatch";

type OptionInput = { label: string; gameName?: string | null; steamAppId?: number | null };

export async function GET() {
  await requireRole("admin");
  const polls = await prisma.dailyPoll.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { username: true, name: true } },
      options: { orderBy: { order: "asc" } },
      votes:   true,
    },
  });
  return NextResponse.json(polls);
}

export async function POST(req: NextRequest) {
  const user = await requireRole("admin");

  const body = await req.json() as {
    title?: string;
    question?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    allowMultiple?: boolean;
    allowFreeText?: boolean;
    rewardCoins?: number;
    sendPush?: boolean;
    options?: OptionInput[];
  };

  const {
    title, question, startDate, endDate,
    isActive = true, allowMultiple = false, allowFreeText = false,
    rewardCoins = 0, sendPush = false, options = [],
  } = body;

  if (!title?.trim() || !question?.trim() || !startDate || !endDate) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }
  if (new Date(endDate) <= new Date(startDate)) {
    return NextResponse.json({ error: "Enddatum muss nach dem Startdatum liegen" }, { status: 400 });
  }
  const cleanOptions = options.filter(o => o.label?.trim());
  if (!allowFreeText && cleanOptions.length < 2) {
    return NextResponse.json({ error: "Mindestens 2 Antwortoptionen nötig, wenn kein reiner Freitext" }, { status: 400 });
  }

  const poll = await prisma.dailyPoll.create({
    data: {
      title:         title.trim(),
      question:      question.trim(),
      startDate:     new Date(startDate),
      endDate:       new Date(endDate),
      isActive,
      allowMultiple,
      allowFreeText,
      rewardCoins:   Math.max(0, Math.trunc(rewardCoins)),
      createdBy:     user.id,
      options: {
        create: cleanOptions.map((o, i) => ({
          label:      o.label.trim(),
          gameName:   o.gameName?.trim() || null,
          steamAppId: o.steamAppId ?? null,
          order:      i,
        })),
      },
    },
    include: { options: { orderBy: { order: "asc" } } },
  });

  if (sendPush && isActive) {
    const pushTitle = `🗳️ ${title.trim()}`;
    const pushBody  = question.trim().slice(0, 120);
    sendPushToAll({ title: pushTitle, body: pushBody, url: "/dashboard" }).catch(() => {});
    sendDiscordDMToAll({ title: pushTitle, description: pushBody, url: "/dashboard", color: 0x2dd4bf }).catch(() => {});
  }

  return NextResponse.json(poll, { status: 201 });
}

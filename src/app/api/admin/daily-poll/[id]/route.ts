import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type OptionInput = { label: string; gameName?: string | null; steamAppId?: number | null };

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireRole("admin");
  const { id } = await params;

  const body = await req.json() as {
    title?: string;
    question?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    allowMultiple?: boolean;
    allowFreeText?: boolean;
    rewardCoins?: number;
    options?: OptionInput[];
  };

  const { title, question, startDate, endDate, isActive, allowMultiple, allowFreeText, rewardCoins, options } = body;

  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    return NextResponse.json({ error: "Enddatum muss nach dem Startdatum liegen" }, { status: 400 });
  }

  const poll = await prisma.$transaction(async tx => {
    if (options) {
      const cleanOptions = options.filter(o => o.label?.trim());
      await tx.dailyPollOption.deleteMany({ where: { pollId: id } });
      if (cleanOptions.length > 0) {
        await tx.dailyPollOption.createMany({
          data: cleanOptions.map((o, i) => ({
            pollId:     id,
            label:      o.label.trim(),
            gameName:   o.gameName?.trim() || null,
            steamAppId: o.steamAppId ?? null,
            order:      i,
          })),
        });
      }
    }

    return tx.dailyPoll.update({
      where: { id },
      data: {
        ...(title         && { title: title.trim() }),
        ...(question      && { question: question.trim() }),
        ...(startDate     && { startDate: new Date(startDate) }),
        ...(endDate       && { endDate: new Date(endDate) }),
        ...(isActive      !== undefined && { isActive }),
        ...(allowMultiple !== undefined && { allowMultiple }),
        ...(allowFreeText !== undefined && { allowFreeText }),
        ...(rewardCoins   !== undefined && { rewardCoins: Math.max(0, Math.trunc(rewardCoins)) }),
      },
      include: { options: { orderBy: { order: "asc" } } },
    });
  });

  return NextResponse.json(poll);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireRole("admin");
  const { id } = await params;
  await prisma.dailyPoll.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const message = await prisma.dailyMessage.findFirst({
    where: {
      isActive:  true,
      startDate: { lte: now },
      endDate:   { gte: now },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, content: true, endDate: true },
  });
  return NextResponse.json(message);
}

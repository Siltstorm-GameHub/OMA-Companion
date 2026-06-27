import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const holders = await prisma.wanderpocalHolder.findMany({
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
    },
    orderBy: [{ scopeType: "asc" }, { scopeValue: "asc" }, { winCount: "desc" }],
  });
  return NextResponse.json(holders);
}

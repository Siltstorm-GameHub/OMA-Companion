import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { invalidateBotConfigCache } from "@/lib/bot-config";

export async function GET() {
  await requireRole("moderator");
  const rows = await prisma.botConfig.findMany();
  return NextResponse.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
}

export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const body = await req.json() as Record<string, string>;

  // Upsert alle übergebenen Key-Value-Paare
  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.botConfig.upsert({
        where:  { key },
        create: { key, value },
        update: { value },
      })
    )
  );

  invalidateBotConfigCache();
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { generateMonthlyQuests } from "@/lib/quests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const result = await generateMonthlyQuests(month, year);
  if (!result) {
    return NextResponse.json({ ok: true, skipped: "Quests für diesen Monat bereits vorhanden" });
  }

  return NextResponse.json({ ok: true, created: result.length, month, year });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadDailyPolls } from "@/lib/daily-poll";

/** Laufende (und kürzlich beendete) Umfragen — mit ?eventId=… nur die eines Events. */
export async function GET(req: NextRequest) {
  const session = await auth();
  const eventId = req.nextUrl.searchParams.get("eventId") ?? undefined;
  return NextResponse.json(await loadDailyPolls({ userId: session?.user?.id, eventId }));
}

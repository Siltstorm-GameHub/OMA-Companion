import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { listEventThreads } from "@/lib/event-comments";

export const dynamic = "force-dynamic";

/** Schnellzugriff: Absprachen der Events, bei denen ich angemeldet bin oder kürzlich geschrieben habe. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const threads = await listEventThreads(user.id);
  return NextResponse.json(
    { threads, unreadTotal: threads.reduce((n, t) => n + t.unread, 0) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

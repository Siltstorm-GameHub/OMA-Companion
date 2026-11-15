import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { hashVersion, listEventThreads } from "@/lib/event-comments";

export const dynamic = "force-dynamic";

/** Schnellzugriff: Absprachen der Events, bei denen ich angemeldet bin oder kürzlich geschrieben habe. */
// Unverändert seit dem letzten Abruf (If-None-Match) → 304 ohne Inhalt (spart Übertragung beim Polling)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const threads = await listEventThreads(user.id);
  const body = { threads, unreadTotal: threads.reduce((n, t) => n + t.unread, 0) };
  const etag = hashVersion(body);
  const headers = { "Cache-Control": "no-store", ETag: etag };
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
  return NextResponse.json(body, { headers });
}

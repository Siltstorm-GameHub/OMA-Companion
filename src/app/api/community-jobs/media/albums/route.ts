import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { listMyAlbums, createAlbum } from "@/lib/fotograf-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json({ albums: await listMyAlbums(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { title, eventId } = await req.json().catch(() => ({}));
  if (typeof title !== "string") return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 });
  const result = await createAlbum(user.id, { title, eventId: typeof eventId === "string" ? eventId : undefined });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

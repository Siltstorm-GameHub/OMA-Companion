import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { setFollowItem } from "@/lib/roadmap-service";

/** "Auf dem Laufenden bleiben" — { on: boolean } (jedes Mitglied) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  const { on } = await req.json().catch(() => ({}));
  const result = await setFollowItem(user.id, id, on !== false);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

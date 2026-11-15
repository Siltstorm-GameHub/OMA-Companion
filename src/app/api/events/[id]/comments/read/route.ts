import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { markEventCommentsRead } from "@/lib/event-comments";

/** Lesestand setzen (Absprachen wurden angesehen). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  await markEventCommentsRead(user.id, id).catch(() => {});
  return NextResponse.json({ ok: true });
}

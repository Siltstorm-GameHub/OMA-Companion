import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getProfileJobBadge } from "@/lib/community-job-service";

export const dynamic = "force-dynamic";

/** Für die Profil-Hero-Section — auf jedem Profil sichtbar, nicht nur dem eigenen. */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { userId } = await params;
  return NextResponse.json(await getProfileJobBadge(userId));
}

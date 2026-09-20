import { NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { listRevisions } from "@/lib/journalist-service";

export const dynamic = "force-dynamic";

/** Frühere Fassungen eines Berichts (Versionsverlauf) — nur Autor/Moderator. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const revisions = await listRevisions(user.id, id, { isAdmin: hasMinRole(user.role, "moderator") });
  if (!revisions) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  return NextResponse.json({ revisions });
}

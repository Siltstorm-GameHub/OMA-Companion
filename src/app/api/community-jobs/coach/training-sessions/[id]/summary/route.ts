import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { sendSessionSummary } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** POST { summary } — Nachbereitung: Zusammenfassung/Tipps an die Teilnehmer eines vergangenen Termins schicken. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { summary } = await req.json().catch(() => ({}));
  if (typeof summary !== "string") return NextResponse.json({ error: "summary erforderlich" }, { status: 400 });

  const result = await sendSessionSummary(user.id, id, summary, { isAdmin: hasMinRole(user.role, "moderator") });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

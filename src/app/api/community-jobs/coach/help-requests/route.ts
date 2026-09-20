import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createHelpRequest, listHelpRequests } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** Eingegangene Hilfe-Anfragen des angemeldeten Coaches (offene zuerst). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json({ requests: await listHelpRequests(user.id) });
}

/** POST { coachId, message } — jeder angemeldete Nutzer, unabhängig davon, ob der Coach gerade "verfügbar" ist. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { coachId, message } = await req.json().catch(() => ({}));
  if (typeof coachId !== "string" || typeof message !== "string") {
    return NextResponse.json({ error: "coachId und message erforderlich" }, { status: 400 });
  }

  const result = await createHelpRequest(user.id, coachId, message);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

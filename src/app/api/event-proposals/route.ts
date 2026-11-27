import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createProposal } from "@/lib/event-proposal-service";

/** Event-Vorschlag anlegen — { title, description, game?, preferredTime? } (jedes Mitglied) */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const result = await createProposal(user.id, await req.json().catch(() => ({})));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

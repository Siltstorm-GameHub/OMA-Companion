import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { answerHelpRequest } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** PATCH { reply? } — Anfrage als beantwortet abschließen; mit `reply` bekommt die anfragende Person die Antwort. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { reply } = await req.json().catch(() => ({}));

  const result = await answerHelpRequest(user.id, id, typeof reply === "string" ? reply : undefined);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

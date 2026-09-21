import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createPromotionRequest, listOpenPromotionRequests, promotionStatusForCoach } from "@/lib/promotion-request-service";

export const dynamic = "force-dynamic";

/** GET ?scope=open (offene Anfragen fürs Marketing-Büro) | mine (Status der eigenen Termine des Coaches). */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (new URL(req.url).searchParams.get("scope") === "mine") return NextResponse.json(await promotionStatusForCoach(user.id));
  return NextResponse.json({ requests: await listOpenPromotionRequests() });
}

/** POST { trainingSessionId, note? } — Coach bittet die Marketing Manager um Werbung für einen Termin. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { trainingSessionId, note } = await req.json().catch(() => ({}));
  if (typeof trainingSessionId !== "string") return NextResponse.json({ error: "trainingSessionId erforderlich" }, { status: 400 });
  const result = await createPromotionRequest(user.id, { trainingSessionId, note: typeof note === "string" ? note : undefined });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

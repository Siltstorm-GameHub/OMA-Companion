import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { setAvailability } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** POST { minutes: number | null, discordChannelId? } — "Ich bin jetzt für Ad-hoc-Hilfe verfügbar" (null = beenden). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { minutes, discordChannelId } = await req.json().catch(() => ({}));
  if (minutes !== null && typeof minutes !== "number") {
    return NextResponse.json({ error: "minutes (Zahl oder null) erforderlich" }, { status: 400 });
  }

  const result = await setAvailability(user.id, minutes, typeof discordChannelId === "string" ? discordChannelId : undefined);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { listGuildEmojis } from "@/lib/discord-rest";

export const dynamic = "force-dynamic";

/** Emojis des Discord-Servers (für den Emoji-Picker in Berichten/Ergänzungen). Leere Liste, wenn der Bot sie nicht abrufen kann. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  return NextResponse.json({ emojis: await listGuildEmojis() }, { headers: { "Cache-Control": "private, max-age=300" } });
}

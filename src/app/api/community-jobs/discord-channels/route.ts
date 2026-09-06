import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { listGuildTextChannels } from "@/lib/discord-rest";

export const dynamic = "force-dynamic";

/** Echte Kanalauswahl statt roher Kanal-ID — für Admin-Konfiguration und die Coach-Kanalwahl. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  return NextResponse.json({ channels: await listGuildTextChannels() });
}

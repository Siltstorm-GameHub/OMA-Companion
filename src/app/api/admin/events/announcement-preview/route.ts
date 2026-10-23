import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { buildNewEventEmbed } from "@/lib/discord-events";

/**
 * Vorschau der Discord-Ankündigung für den Event-Wizard — nutzt exakt denselben Embed-Aufbau
 * (inkl. Benachrichtigungs-Vorlage "event_new") wie die echte Ankündigung, sendet aber nichts.
 * Body: { title, game, format, genre, startAt, maxPlayers, participationCoins }
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const startAt = new Date(body.startAt);
  if (typeof body.title !== "string" || isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "Titel und Start fehlen" }, { status: 400 });
  }
  const embed = await buildNewEventEmbed({
    eventId: "preview",
    title: body.title,
    game: typeof body.game === "string" && body.game ? body.game : null,
    format: typeof body.format === "string" ? body.format : null,
    genre: typeof body.genre === "string" ? body.genre : null,
    startAt,
    maxPlayers: Number(body.maxPlayers) > 0 ? Number(body.maxPlayers) : null,
    pointReward: Number(body.participationCoins) || 0,
    teilnehmer: 0,
  });
  return NextResponse.json({ title: embed.title, description: embed.description, fields: embed.fields });
}

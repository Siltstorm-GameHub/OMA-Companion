import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";

export async function POST(req: NextRequest) {
  await requireRole("admin");

  const { text, channelId } = await req.json() as { text?: string; channelId?: string };
  if (!text?.trim()) return NextResponse.json({ error: "Kein Text angegeben" }, { status: 400 });
  if (!channelId)    return NextResponse.json({ error: "Kein Kanal angegeben" }, { status: 400 });

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Bot-Token nicht konfiguriert" }, { status: 500 });

  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method:  "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ content: text.trim() }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: `Discord-Fehler: ${err}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

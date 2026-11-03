// ============================================
// GET /api/blocks/mp-token — Anmelde-Token für den OMA-Blocks-Multiplayer-Server
// ============================================
// Liefert { url, token }. Der Multiplayer-Server (src/blocks-server, hängt am Bot auf Render) prüft das Token mit
// demselben BLOCKS_MP_SECRET — ein eigenes Login gibt es dort nicht. Fehlt die Konfiguration,
// antwortet die Route mit 503 und die Versus-Seite zeigt einen Hinweis.

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { signMpToken } from "@/lib/blocks/mp-token";
import { BLOCKS_WS_PATH } from "@/lib/blocks/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const secret = process.env.BLOCKS_MP_SECRET;
  const rawUrl = process.env.NEXT_PUBLIC_BLOCKS_MP_URL;
  if (!secret || !rawUrl) {
    return Response.json({ error: "Der Versus-Modus ist noch nicht eingerichtet." }, { status: 503 });
  }

  // Nur Host angegeben (wss://bot.onrender.com)? Dann den Standard-Pfad des Versus-Servers anhängen.
  let url = rawUrl;
  try {
    const u = new URL(rawUrl);
    if (u.pathname === "/" || u.pathname === "") u.pathname = BLOCKS_WS_PATH;
    url = u.toString();
  } catch {
    /* ungültige URL — unverändert durchreichen, der Browser meldet den Fehler */
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, name: true, image: true },
  });
  const token = signMpToken(secret, {
    uid: session.user.id,
    name: user?.username ?? user?.name ?? session.user.name ?? "Spieler",
    img: user?.image ?? null,
  });
  return Response.json({ url, token }, { headers: { "Cache-Control": "no-store" } });
}

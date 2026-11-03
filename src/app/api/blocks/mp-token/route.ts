// ============================================
// GET /api/blocks/mp-token — Anmelde-Token für den OMA-Blocks-Multiplayer-Server
// ============================================
// Liefert { url, token }. Der Multiplayer-Server (src/blocks-server, Railway) prüft das Token mit
// demselben BLOCKS_MP_SECRET — ein eigenes Login gibt es dort nicht. Fehlt die Konfiguration,
// antwortet die Route mit 503 und die Versus-Seite zeigt einen Hinweis.

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { signMpToken } from "@/lib/blocks/mp-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const secret = process.env.BLOCKS_MP_SECRET;
  const url = process.env.NEXT_PUBLIC_BLOCKS_MP_URL;
  if (!secret || !url) {
    return Response.json({ error: "Der Versus-Modus ist noch nicht eingerichtet." }, { status: 503 });
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

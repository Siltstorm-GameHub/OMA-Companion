// ============================================
// POST /api/blocks/tournaments/[eventId]/ticket — Ticket für den eigenen Turnier-Raum
// ============================================
// Signiert (BLOCKS_MP_SECRET) Gruppe, Rundenzahl und Teilnehmerliste. Der Versus-Server baut daraus den
// Raum und lässt nur Spieler mit gültigem Ticket hinein (siehe lib/blocks/mp-token.ts).

import { auth } from "@/auth";
import { signTicket } from "@/lib/blocks/mp-token";
import { ticketFor } from "@/lib/blocks/tournament";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const secret = process.env.BLOCKS_MP_SECRET;
  if (!secret) return Response.json({ error: "Der Versus-Modus ist noch nicht eingerichtet." }, { status: 503 });
  const { eventId } = await params;
  const result = await ticketFor(eventId, session.user.id);
  if (typeof result === "string") return Response.json({ error: result }, { status: 409 });
  return Response.json({ ticket: signTicket(secret, { ...result, uid: session.user.id }) }, { headers: { "Cache-Control": "no-store" } });
}

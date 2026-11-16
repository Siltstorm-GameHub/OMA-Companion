import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileOverlayState } from "@/lib/overlay-state";
import { overlayStreamResponse, type StreamPacing } from "@/lib/overlay-sse";

export const dynamic = "force-dynamic";

/** Profildaten ändern sich selten (siehe Cache-Dauer in lib/overlay-state.ts) — 5s reicht, in
 *  Ruhe 15s (der Profil-Cache hält ohnehin 30s). */
const PACING: StreamPacing = { fast: 5000, idle: 15_000 };

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { overlayToken: true } });
  if (!user?.overlayToken || user.overlayToken !== token) {
    return new Response("Invalid token", { status: 403 });
  }

  return overlayStreamResponse(req, PACING, () => getProfileOverlayState(userId));
}

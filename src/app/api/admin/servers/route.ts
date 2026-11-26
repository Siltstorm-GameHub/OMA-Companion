import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { getServersWithAdminCounts, trafficLight } from "@/lib/gameservers";
import { pickServerFields, validateServerInput } from "@/lib/gameserver-input";
import { onServerCreated } from "@/lib/games/server-candidates-server";

export async function GET() {
  await requireRole("moderator");
  return NextResponse.json(await getServersWithAdminCounts());
}

export async function POST(req: NextRequest) {
  const admin = await requireRole("moderator");
  const body = await req.json().catch(() => null);

  const result = validateServerInput(pickServerFields(body));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const server = await prisma.gameServer.create({
    data: { ...result.data, createdBy: admin.id },
  });

  // Wer beim passenden Server-Kandidaten zugesagt hat: Bewerbung anlegen und benachrichtigen
  const { notified } = await onServerCreated(server).catch(err => {
    console.error("[servers] Zusagen übernehmen", err);
    return { notified: 0 };
  });
  const pendingCount = server.openAccess || notified === 0 ? 0 : Math.min(notified, server.maxSlots);

  return NextResponse.json({ ...server, occupied: 0, pendingCount, interestedNotified: notified, light: trafficLight(server.maxSlots, server.maxSlots) }, { status: 201 });
}

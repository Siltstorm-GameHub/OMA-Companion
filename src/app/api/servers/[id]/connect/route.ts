import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Wird beim Kopieren der Zugangsdaten aufgerufen, um den Zeitpunkt der letzten
// Nutzung für Admins sichtbar zu machen (kein Einfluss auf den Zugriff selbst).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;
  const { id: serverId } = await params;

  const application = await prisma.serverApplication.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!application || application.status !== "approved") {
    return NextResponse.json({ error: "Kein aktiver Zugang" }, { status: 403 });
  }

  await prisma.serverApplication.update({
    where: { id: application.id },
    data: { lastConnectedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

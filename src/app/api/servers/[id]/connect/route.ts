import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SERVER_ACCESS_DAYS } from "@/lib/gameservers";

// Wird beim Klick auf "Jetzt verbinden" aufgerufen. Verlängert den 30-Tage-Zugriff
// ab dem Zeitpunkt der letzten tatsächlichen Nutzung, statt starr ab der Genehmigung.
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

  const now = new Date();
  const updated = await prisma.serverApplication.update({
    where: { id: application.id },
    data: {
      lastConnectedAt: now,
      expiresAt: new Date(now.getTime() + SERVER_ACCESS_DAYS * 24 * 60 * 60 * 1000),
      expiryNotifiedAt: null,
    },
  });

  return NextResponse.json({ ok: true, expiresAt: updated.expiresAt });
}

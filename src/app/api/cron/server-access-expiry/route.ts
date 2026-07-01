import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

const WARN_BEFORE_MS = 3 * 24 * 60 * 60 * 1000;

// Warnt vor bald ablaufendem Server-Zugriff und markiert abgelaufenen Zugriff als "expired".
// Wird täglich um 04:00 UTC von Vercel Cron aufgerufen.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const expiringSoon = await prisma.serverApplication.findMany({
    where: {
      status: "approved",
      expiryNotifiedAt: null,
      expiresAt: { gt: now, lte: new Date(now.getTime() + WARN_BEFORE_MS) },
    },
    include: { server: true },
  });

  for (const application of expiringSoon) {
    await createNotification(application.userId, {
      type: "server",
      title: "Zugang läuft bald ab",
      body: `Dein Zugang zu „${application.server.name}" läuft in Kürze ab.`,
      url: "/servers",
    });
    await prisma.serverApplication.update({
      where: { id: application.id },
      data: { expiryNotifiedAt: now },
    });
  }

  const expired = await prisma.serverApplication.findMany({
    where: { status: "approved", expiresAt: { lte: now } },
    include: { server: true },
  });

  for (const application of expired) {
    await prisma.serverApplication.update({
      where: { id: application.id },
      data: { status: "expired" },
    });
    await createNotification(application.userId, {
      type: "server",
      title: "Zugang abgelaufen",
      body: `Dein Zugang zu „${application.server.name}" ist abgelaufen.`,
      url: "/servers",
    });
  }

  return NextResponse.json({ notified: expiringSoon.length, expired: expired.length });
}

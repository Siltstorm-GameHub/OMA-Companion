import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createTrainingSession } from "@/lib/coach-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Anstehende Trainings-Termine (für alle sichtbar — Coach-Büro + Anmeldung). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const sessions = await prisma.coachTrainingSession.findMany({
    where: { startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
    include: {
      coach: { select: { id: true, username: true, name: true } },
      _count: { select: { signups: true } },
    },
  });
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { title, description, startAt, capacity, discordChannelId } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || typeof startAt !== "string") {
    return NextResponse.json({ error: "Titel und Startzeit erforderlich" }, { status: 400 });
  }

  const result = await createTrainingSession(user.id, {
    title, description: typeof description === "string" ? description : undefined,
    startAt: new Date(startAt), capacity: typeof capacity === "number" ? capacity : undefined,
    discordChannelId: typeof discordChannelId === "string" ? discordChannelId : undefined,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

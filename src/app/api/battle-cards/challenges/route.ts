import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createChallenge, ChallengeError } from "@/lib/battle-cards/challenge";
import { dispatchNotification } from "@/lib/notify-dispatch";

const userSelect = { id: true, username: true, name: true, image: true } as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;

  const [incoming, outgoing, history] = await Promise.all([
    prisma.battleChallenge.findMany({
      where: { opponentId: userId, status: "pending" },
      include: { challenger: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.battleChallenge.findMany({
      where: { challengerId: userId, status: "pending" },
      include: { opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.battleChallenge.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }], status: { in: ["resolved", "declined"] } },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({ incoming, outgoing, history });
}

const requestSchema = z.object({ opponentId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const challenge = await createChallenge(userId, parsed.data.opponentId);

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } });
    dispatchNotification("battle_challenge", {
      users: [parsed.data.opponentId],
      placeholders: { "{challenger}": me?.username ?? me?.name ?? "Ein Mitglied" },
      urlOverride: "/battle-cards?tab=community",
    }).catch(() => {});

    return NextResponse.json({ ok: true, challenge });
  } catch (error) {
    if (error instanceof ChallengeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

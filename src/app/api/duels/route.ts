import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMinigamesConfig, isMinigameEnabled } from "@/lib/minigames-config";
import { dispatchNotification } from "@/lib/notify-dispatch";
import {
  isPairOnCooldown, getDailyWageredTotal, getDailyDuelCount,
  MAX_DUELS_PER_DAY, CHALLENGE_EXPIRY_HOURS,
} from "@/lib/duel";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const userSelect = { id: true, username: true, name: true, image: true } as const;

  const [incoming, outgoing, history] = await Promise.all([
    prisma.duelChallenge.findMany({
      where: { opponentId: userId, status: "pending" },
      include: { challenger: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.duelChallenge.findMany({
      where: { challengerId: userId, status: "pending" },
      include: { opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.duelChallenge.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }], status: { in: ["resolved", "declined", "expired"] } },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({ incoming, outgoing, history });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  if (!(await isMinigameEnabled("duel"))) {
    return NextResponse.json({ error: "Münzen-Duelle sind zurzeit deaktiviert" }, { status: 403 });
  }

  const { opponentId, wager } = await req.json();
  if (!opponentId || typeof wager !== "number" || !Number.isInteger(wager)) {
    return NextResponse.json({ error: "opponentId/wager fehlt oder ungültig" }, { status: 400 });
  }
  if (opponentId === userId) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst herausfordern" }, { status: 400 });
  }

  const config = await getMinigamesConfig();
  if (wager < config.duelMinWager || wager > config.duelMaxWager) {
    return NextResponse.json({ error: `Einsatz muss zwischen ${config.duelMinWager} und ${config.duelMaxWager} Münzen liegen` }, { status: 400 });
  }

  const [me, opponent] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true, username: true, name: true } }),
    prisma.user.findUnique({ where: { id: opponentId }, select: { id: true, points: true } }),
  ]);
  if (!opponent) return NextResponse.json({ error: "Gegner nicht gefunden" }, { status: 404 });
  if (!me || me.points < wager) return NextResponse.json({ error: "Nicht genug Münzen für diesen Einsatz" }, { status: 400 });
  if (opponent.points < wager) return NextResponse.json({ error: "Dieser Nutzer hat nicht genug Münzen für diesen Einsatz" }, { status: 400 });

  if (await isPairOnCooldown(userId, opponentId)) {
    return NextResponse.json({ error: "Ihr habt kürzlich schon gegeneinander geduellt — versuch es später erneut" }, { status: 409 });
  }

  const [dailyWagered, dailyCount] = await Promise.all([
    getDailyWageredTotal(userId),
    getDailyDuelCount(userId),
  ]);
  if (dailyWagered + wager > config.duelDailyWagerCap) {
    return NextResponse.json({ error: `Tages-Wettlimit von ${config.duelDailyWagerCap} Münzen erreicht` }, { status: 409 });
  }
  if (dailyCount >= MAX_DUELS_PER_DAY) {
    return NextResponse.json({ error: `Maximal ${MAX_DUELS_PER_DAY} Duelle pro Tag` }, { status: 409 });
  }

  // Einsatz des Herausforderers sofort escrowen, damit er bei Annahme garantiert zahlungsfähig ist
  // (ohne Escrow könnte er das Guthaben zwischenzeitlich anderweitig ausgeben)
  let challenge;
  try {
    challenge = await prisma.$transaction(async tx => {
      const debit = await tx.user.updateMany({
        where: { id: userId, points: { gte: wager } },
        data: { points: { decrement: wager } },
      });
      if (debit.count === 0) throw new Error("INSUFFICIENT_FUNDS");

      const created = await tx.duelChallenge.create({
        data: { challengerId: userId, opponentId, wager },
      });
      await tx.pointTransaction.create({
        data: { userId, amount: -wager, reason: "🔒 Duell-Einsatz reserviert" },
      });
      return created;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ error: "Nicht genug Münzen für diesen Einsatz" }, { status: 400 });
    }
    throw err;
  }

  dispatchNotification("duel_challenge", {
    users: [opponentId],
    placeholders: {
      "{challenger}": me.username ?? me.name ?? "Ein Mitglied",
      "{wager}": String(wager),
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, challenge, expiresInHours: CHALLENGE_EXPIRY_HOURS });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMinigamesConfig, isMinigameEnabled } from "@/lib/minigames-config";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { isExpired, isPairOnCooldown, getDailyWageredTotal, getDailyDuelCount, MAX_DUELS_PER_DAY } from "@/lib/duel";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  if (!(await isMinigameEnabled("duel"))) {
    return NextResponse.json({ error: "Münzen-Duelle sind zurzeit deaktiviert" }, { status: 403 });
  }

  const { action } = await req.json();
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  }

  const challenge = await prisma.duelChallenge.findUnique({
    where: { id },
    include: {
      challenger: { select: { id: true, username: true, name: true } },
      opponent: { select: { id: true, username: true, name: true } },
    },
  });
  if (!challenge) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (challenge.opponentId !== userId) return NextResponse.json({ error: "Nur der Herausgeforderte kann antworten" }, { status: 403 });
  if (challenge.status !== "pending") return NextResponse.json({ error: "Diese Herausforderung ist nicht mehr offen" }, { status: 409 });

  if (isExpired(challenge)) {
    await prisma.duelChallenge.update({ where: { id }, data: { status: "expired" } });
    return NextResponse.json({ error: "Diese Herausforderung ist abgelaufen" }, { status: 409 });
  }

  if (action === "decline") {
    await prisma.duelChallenge.update({ where: { id }, data: { status: "declined", respondedAt: new Date() } });
    dispatchNotification("duel_result", {
      users: [challenge.challengerId],
      placeholders: { "{result}": `${challenge.opponent.username ?? challenge.opponent.name ?? "Der Gegner"} hat dein Duell abgelehnt.` },
    }).catch(() => {});
    return NextResponse.json({ ok: true, status: "declined" });
  }

  // ── Annehmen: Cooldown/Limits erneut prüfen (können sich seit Erstellung geändert haben) ──
  const config = await getMinigamesConfig();
  if (challenge.wager < config.duelMinWager || challenge.wager > config.duelMaxWager) {
    return NextResponse.json({ error: "Einsatz liegt außerhalb der aktuell erlaubten Grenzen" }, { status: 409 });
  }
  if (await isPairOnCooldown(challenge.challengerId, challenge.opponentId)) {
    return NextResponse.json({ error: "Cooldown zwischen euch beiden ist noch aktiv" }, { status: 409 });
  }
  for (const uid of [challenge.challengerId, challenge.opponentId]) {
    const [wagered, count] = await Promise.all([getDailyWageredTotal(uid), getDailyDuelCount(uid)]);
    if (wagered + challenge.wager > config.duelDailyWagerCap) {
      return NextResponse.json({ error: "Tages-Wettlimit eines Teilnehmers erreicht" }, { status: 409 });
    }
    if (count >= MAX_DUELS_PER_DAY) {
      return NextResponse.json({ error: "Tages-Duell-Limit eines Teilnehmers erreicht" }, { status: 409 });
    }
  }

  const winnerId = Math.random() < 0.5 ? challenge.challengerId : challenge.opponentId;
  const wager = challenge.wager;

  try {
    await prisma.$transaction(async tx => {
      // Escrow: beide Einsätze atomar abbuchen, nur wenn genug Guthaben vorhanden ist
      const debits = await Promise.all([challenge.challengerId, challenge.opponentId].map(uid =>
        tx.user.updateMany({ where: { id: uid, points: { gte: wager } }, data: { points: { decrement: wager } } })
      ));
      if (debits.some(d => d.count === 0)) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      await tx.user.update({ where: { id: winnerId }, data: { points: { increment: wager * 2 } } });
      await tx.pointTransaction.createMany({
        data: [
          { userId: challenge.challengerId, amount: -wager, reason: "⚔️ Duell-Einsatz" },
          { userId: challenge.opponentId, amount: -wager, reason: "⚔️ Duell-Einsatz" },
          { userId: winnerId, amount: wager * 2, reason: "⚔️ Duell gewonnen" },
        ],
      });
      await tx.duelChallenge.update({
        where: { id },
        data: { status: "resolved", winnerId, respondedAt: new Date(), resolvedAt: new Date() },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ error: "Nicht genug Münzen bei einem der Teilnehmer" }, { status: 409 });
    }
    throw err;
  }

  const challengerName = challenge.challenger.username ?? challenge.challenger.name ?? "Herausforderer";
  const opponentName = challenge.opponent.username ?? challenge.opponent.name ?? "Gegner";
  dispatchNotification("duel_result", {
    users: [challenge.challengerId],
    placeholders: { "{result}": winnerId === challenge.challengerId ? `Du hast gegen ${opponentName} gewonnen: +${wager} Münzen!` : `Du hast gegen ${opponentName} verloren: -${wager} Münzen.` },
  }).catch(() => {});
  dispatchNotification("duel_result", {
    users: [challenge.opponentId],
    placeholders: { "{result}": winnerId === challenge.opponentId ? `Du hast gegen ${challengerName} gewonnen: +${wager} Münzen!` : `Du hast gegen ${challengerName} verloren: -${wager} Münzen.` },
  }).catch(() => {});

  return NextResponse.json({ ok: true, status: "resolved", winnerId });
}

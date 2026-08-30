import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { joinQueue, pollQueue, leaveQueue } from "@/lib/battle-cards/matchmaking";
import { ChallengeError } from "@/lib/battle-cards/challenge";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { updateQuestProgress } from "@/lib/quests";

/** GET: aktuellen Warteschlangen-Status abfragen (Polling). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const status = await pollQueue(session.user.id);
  return NextResponse.json(status);
}

/** POST: der Warteschlange beitreten — matched sofort, falls schon jemand wartet. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;

  try {
    const result = await joinQueue(userId);

    if (result.matched) {
      const challenge = await prisma.battleChallenge.findUnique({ where: { id: result.challengeId } });
      if (challenge) {
        updateQuestProgress(challenge.challengerId, "BATTLE_CARD_DUEL", 1).catch(() => {});
        updateQuestProgress(challenge.opponentId, "BATTLE_CARD_DUEL", 1).catch(() => {});

        const [challenger, opponent] = await Promise.all([
          prisma.user.findUnique({ where: { id: challenge.challengerId }, select: { username: true, name: true } }),
          prisma.user.findUnique({ where: { id: challenge.opponentId }, select: { username: true, name: true } }),
        ]);
        const challengerName = challenger?.username ?? challenger?.name ?? "Gegner";
        const opponentName = opponent?.username ?? opponent?.name ?? "Gegner";
        const url = challenge.battleId ? `/battle-cards/battles/${challenge.battleId}` : undefined;

        dispatchNotification("battle_result", {
          users: [challenge.challengerId],
          urlOverride: url,
          placeholders: {
            "{result}":
              challenge.winnerId === challenge.challengerId
                ? `Zufallsgegner-Match gewonnen gegen ${opponentName}!`
                : challenge.winnerId === challenge.opponentId
                  ? `Zufallsgegner-Match verloren gegen ${opponentName}.`
                  : `Unentschieden gegen ${opponentName}.`,
          },
        }).catch(() => {});
        dispatchNotification("battle_result", {
          users: [challenge.opponentId],
          urlOverride: url,
          placeholders: {
            "{result}":
              challenge.winnerId === challenge.opponentId
                ? `Zufallsgegner-Match gewonnen gegen ${challengerName}!`
                : challenge.winnerId === challenge.challengerId
                  ? `Zufallsgegner-Match verloren gegen ${challengerName}.`
                  : `Unentschieden gegen ${challengerName}.`,
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ChallengeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

/** DELETE: Warteschlange verlassen (nur solange noch kein Match gefunden wurde). */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  await leaveQueue(session.user.id);
  return NextResponse.json({ ok: true });
}

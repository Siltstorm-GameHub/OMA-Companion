import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { respondToChallenge, ChallengeError } from "@/lib/battle-cards/challenge";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { updateQuestProgress } from "@/lib/quests";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/battle-cards/challenges/[id]/respond">) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "Ungültige Aktion." }, { status: 400 });
  }

  try {
    const challenge = await respondToChallenge(id, userId, action);

    const [challenger, opponent] = await Promise.all([
      prisma.user.findUnique({ where: { id: challenge.challengerId }, select: { username: true, name: true } }),
      prisma.user.findUnique({ where: { id: challenge.opponentId }, select: { username: true, name: true } }),
    ]);
    const challengerName = challenger?.username ?? challenger?.name ?? "Herausforderer";
    const opponentName = opponent?.username ?? opponent?.name ?? "Gegner";

    if (challenge.status === "declined") {
      dispatchNotification("battle_result", {
        users: [challenge.challengerId],
        placeholders: { "{result}": `${opponentName} hat deine Herausforderung abgelehnt.` },
      }).catch(() => {});
    } else if (challenge.status === "resolved") {
      updateQuestProgress(challenge.challengerId, "BATTLE_CARD_DUEL", 1).catch(() => {});
      updateQuestProgress(challenge.opponentId, "BATTLE_CARD_DUEL", 1).catch(() => {});

      const url = challenge.battleId ? `/battle-cards/battles/${challenge.battleId}` : undefined;
      dispatchNotification("battle_result", {
        users: [challenge.challengerId],
        urlOverride: url,
        placeholders: {
          "{result}":
            challenge.winnerId === challenge.challengerId
              ? `Du hast gegen ${opponentName} gewonnen!`
              : challenge.winnerId === challenge.opponentId
                ? `Du hast gegen ${opponentName} verloren.`
                : `Unentschieden gegen ${opponentName}.`,
        },
      }).catch(() => {});
      dispatchNotification("battle_result", {
        users: [challenge.opponentId],
        urlOverride: url,
        placeholders: {
          "{result}":
            challenge.winnerId === challenge.opponentId
              ? `Du hast gegen ${challengerName} gewonnen!`
              : challenge.winnerId === challenge.challengerId
                ? `Du hast gegen ${challengerName} verloren.`
                : `Unentschieden gegen ${challengerName}.`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, challenge });
  } catch (error) {
    if (error instanceof ChallengeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

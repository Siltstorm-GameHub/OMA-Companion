import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { respondToChallenge, ChallengeError } from "@/lib/battle-cards/challenge";
import { dispatchNotification } from "@/lib/notify-dispatch";

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

    const opponent = await prisma.user.findUnique({
      where: { id: challenge.opponentId },
      select: { username: true, name: true },
    });
    const opponentName = opponent?.username ?? opponent?.name ?? "Gegner";

    if (challenge.status === "declined") {
      dispatchNotification("battle_result", {
        users: [challenge.challengerId],
        placeholders: { "{result}": `${opponentName} hat deine Herausforderung abgelehnt.` },
      }).catch(() => {});
    } else if (challenge.status === "live" && challenge.liveBattleId) {
      // Der Kampf läuft bereits (siehe live-battle.ts) — der Herausforderer weiß sonst
      // nicht, dass er jetzt am Zug sein könnte. Ergebnis-Benachrichtigung + Quest-
      // Fortschritt laufen zentral bei Abschluss (finalizeLiveBattle).
      dispatchNotification("battle_challenge", {
        users: [challenge.challengerId],
        placeholders: { "{challenger}": `${opponentName} hat deine Herausforderung angenommen — der Kampf läuft` },
        urlOverride: `/battle-cards/live/${challenge.liveBattleId}`,
      }).catch(() => {});
    }
    // status "resolved" (Kampf endete sofort, z.B. Sonderfall): Ergebnis-Benachrichtigung
    // + Quest-Fortschritt liefen bereits zentral bei LiveBattle-Abschluss.

    return NextResponse.json({ ok: true, challenge });
  } catch (error) {
    if (error instanceof ChallengeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { joinQueue, pollQueue, leaveQueue } from "@/lib/battle-cards/matchmaking";
import { ChallengeError } from "@/lib/battle-cards/challenge";

/** GET: aktuellen Warteschlangen-Status abfragen (Polling). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const status = await pollQueue(session.user.id);
  return NextResponse.json(status);
}

/** POST: der Warteschlange beitreten — matched sofort, falls schon jemand wartet.
 *  Das Match selbst ist ein interaktiver LiveBattle (siehe live-battle.ts) —
 *  Ergebnis-Benachrichtigung/Quest-Fortschritt laufen dort zentral bei Abschluss. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const userId = session.user.id;

  try {
    const result = await joinQueue(userId);
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

// ============================================
// GET/PUT /api/battle-cards/duel-deck
// ============================================
// Verwaltung des aktiven OMA-Duels-Decks (20 Karten, davon mind.
// DUEL_DECK_MIN_UNIT_CARDS Einheiten-Karten) — Pendant zu /lineup für den
// alten 5er-PVE-Modus.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { DuelDeckError, getActiveDuelDeck, setActiveDuelDeck } from "@/lib/battle-cards/duel-deck";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const deck = await getActiveDuelDeck(session.user.id);
  return NextResponse.json({
    unitCardIds: deck?.unitCardIds ?? [],
    tacticCardIds: deck?.tacticCardIds ?? [],
  });
}

const requestSchema = z.object({
  unitCardIds: z.array(z.string().min(1)),
  tacticCardIds: z.array(z.string().min(1)),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await setActiveDuelDeck(session.user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DuelDeckError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

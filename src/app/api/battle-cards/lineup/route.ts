import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setLineup, LineupError, LINEUP_SIZE } from "@/lib/battle-cards/lineup";

const requestSchema = z.object({
  cardIds: z.array(z.string().min(1)).min(1).max(LINEUP_SIZE),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await setLineup(session.user.id, parsed.data.cardIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LineupError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

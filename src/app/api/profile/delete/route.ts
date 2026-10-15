import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { anonymizeUser, DELETE_CONFIRM_PHRASE as CONFIRM_PHRASE } from "@/lib/account-deletion";

/** Löscht (anonymisiert) das eigene Konto. Erwartet { confirm: "LÖSCHEN" } als Schutz vor Fehlklicks. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json({ error: `Bitte zur Bestätigung „${CONFIRM_PHRASE}" eingeben.` }, { status: 400 });
  }

  await anonymizeUser(session.user.id);
  return NextResponse.json({ ok: true });
}

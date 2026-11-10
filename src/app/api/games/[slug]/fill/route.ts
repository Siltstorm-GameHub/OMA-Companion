import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { ConflictError, fillMissingFields } from "@/lib/games/service";

/**
 * Fehlende Angaben ergänzen — nur leere Felder werden gesetzt, jede Ergänzung wird protokolliert.
 * PUT /api/games/[slug]/fill  { fields: Partial<GameFields> }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const { slug } = await params;

  const body = await req.json().catch(() => null) as { fields?: unknown } | null;
  if (!body?.fields || typeof body.fields !== "object") return NextResponse.json({ error: "fields fehlt" }, { status: 400 });

  try {
    const result = await fillMissingFields({ id: user.id, isModerator: hasMinRole(user.role, "moderator") }, slug, body.fields);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ filled: result.filled });
  } catch (err) {
    if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}

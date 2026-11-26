import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { setServerInterest } from "@/lib/games/server-candidates-server";
import { isServerInterestLevel } from "@/lib/games/server-candidates";

/**
 * "Ich wäre dabei" für einen möglichen OMA-Server zu diesem Spiel.
 * PUT /api/games/[slug]/server-interest  { level: "casual" | "regular" | null }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const { slug } = await params;

  const body = await req.json().catch(() => null) as { level?: unknown } | null;
  if (!body || !("level" in body) || (body.level !== null && !isServerInterestLevel(body.level))) {
    return NextResponse.json({ error: "level muss casual, regular oder null sein" }, { status: 400 });
  }

  const r = await setServerInterest(user.id, slug, body.level as never);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ level: r.level, regular: r.regular, casual: r.casual });
}

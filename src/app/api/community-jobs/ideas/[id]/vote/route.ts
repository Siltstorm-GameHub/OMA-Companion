import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { voteIdea } from "@/lib/visionaer-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { stars, reason } = await req.json().catch(() => ({}));
  if (typeof stars !== "number" || typeof reason !== "string") {
    return NextResponse.json({ error: "stars und reason erforderlich" }, { status: 400 });
  }

  const result = await voteIdea(user.id, id, stars, reason);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

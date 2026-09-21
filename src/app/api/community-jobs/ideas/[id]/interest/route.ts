import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { setIdeaInterest } from "@/lib/visionaer-service";

/** POST { kind: "PARTICIPATE" | "HELP", on?: boolean } — "Ich wäre dabei" / "Ich helfe mit" setzen bzw. zurücknehmen. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  const { kind, on } = await req.json().catch(() => ({}));
  if (typeof kind !== "string") return NextResponse.json({ error: "kind erforderlich" }, { status: 400 });
  const result = await setIdeaInterest(user.id, id, kind, on !== false);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

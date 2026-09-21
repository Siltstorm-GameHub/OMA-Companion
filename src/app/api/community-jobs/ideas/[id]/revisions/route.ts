import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { listIdeaRevisions } from "@/lib/visionaer-service";

export const dynamic = "force-dynamic";

/** Frühere Fassungen einer Idee (öffentlich lesbar, wie die Idee selbst). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ revisions: await listIdeaRevisions(id) });
}

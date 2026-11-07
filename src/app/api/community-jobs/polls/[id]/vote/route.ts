import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { votePoll } from "@/lib/post-poll-service";
import { canWorkCommunityJobs } from "@/lib/community-job-access";

export const dynamic = "force-dynamic";

/** Stimme in einer Beitrags-Umfrage abgeben (einmalig) — zahlt ggf. die Teilnahme-Münzen (gedeckelt). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!(await canWorkCommunityJobs(user.id))) return NextResponse.json({ error: "Für dein Konto nicht verfügbar" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const optionId = typeof body.optionId === "string" ? body.optionId : "";
  const result = await votePoll(user.id, id, optionId);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

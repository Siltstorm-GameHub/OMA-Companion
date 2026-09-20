import { NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { getInterviewForUser } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const interview = await getInterviewForUser(user.id, id, hasMinRole(user.role, "moderator"));
  if (!interview) return NextResponse.json({ error: "Interview nicht gefunden" }, { status: 404 });
  return NextResponse.json({ interview });
}

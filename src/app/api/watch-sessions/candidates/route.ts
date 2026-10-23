import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findInviteCandidates } from "@/lib/watch-sessions";

/** Mitglieder für die Einladung (?q=Name), live zuerst. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 40);
  return NextResponse.json({ members: await findInviteCandidates(session.user.id, q) });
}

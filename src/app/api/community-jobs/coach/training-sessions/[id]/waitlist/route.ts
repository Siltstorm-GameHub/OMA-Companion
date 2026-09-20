import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { joinWaitlist, leaveWaitlist } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** Auf die Warteliste eines ausgebuchten Termins setzen — rückt automatisch nach, sobald ein Platz frei wird. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await joinWaitlist(user.id, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  return NextResponse.json(await leaveWaitlist(user.id, id));
}

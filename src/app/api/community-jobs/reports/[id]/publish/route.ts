import { NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { publishReport } from "@/lib/journalist-service";

export const dynamic = "force-dynamic";

/** Entwurf veröffentlichen. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await publishReport(user.id, id, { isAdmin: hasMinRole(user.role, "moderator") });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

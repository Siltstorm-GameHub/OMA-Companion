import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { updateAsset, deleteAsset } from "@/lib/fotograf-service";

/** Eigentümer ODER Admin (dann inkl. optionalem Zuschnitt-Ersatzbild `url`). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { caption, url } = await req.json().catch(() => ({}));
  if (caption !== undefined && typeof caption !== "string") return NextResponse.json({ error: "caption muss ein String sein" }, { status: 400 });
  if (url !== undefined && typeof url !== "string") return NextResponse.json({ error: "url muss ein String sein" }, { status: 400 });

  const isAdmin = hasMinRole(user.role, "moderator");
  const result = await updateAsset(user.id, id, { caption, url }, { isAdmin });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const isAdmin = hasMinRole(user.role, "moderator");
  const result = await deleteAsset(user.id, id, { isAdmin });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

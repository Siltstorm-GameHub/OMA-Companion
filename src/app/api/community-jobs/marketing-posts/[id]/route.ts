import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { updateMarketingPost, deleteMarketingPost } from "@/lib/marketing-manager-service";

/**
 * Autor ODER Admin. `imageUrl`/`assetId`: String → setzen, `null` → Bild
 * entfernen, weglassen → unverändert (siehe updateMarketingPost).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { caption, imageUrl, assetId } = await req.json().catch(() => ({}));
  if (caption !== undefined && typeof caption !== "string") return NextResponse.json({ error: "caption muss ein String sein" }, { status: 400 });
  if (imageUrl !== undefined && imageUrl !== null && typeof imageUrl !== "string") return NextResponse.json({ error: "imageUrl muss ein String oder null sein" }, { status: 400 });
  if (assetId !== undefined && assetId !== null && typeof assetId !== "string") return NextResponse.json({ error: "assetId muss ein String oder null sein" }, { status: 400 });

  const isAdmin = hasMinRole(user.role, "moderator");
  const result = await updateMarketingPost(user.id, id, { caption, imageUrl, assetId }, { isAdmin });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const isAdmin = hasMinRole(user.role, "moderator");
  const result = await deleteMarketingPost(user.id, id, { isAdmin });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

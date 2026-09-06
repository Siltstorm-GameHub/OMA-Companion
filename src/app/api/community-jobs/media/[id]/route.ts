import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { updateAsset, deleteAsset } from "@/lib/fotograf-service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { caption } = await req.json().catch(() => ({}));
  if (typeof caption !== "string") return NextResponse.json({ error: "caption erforderlich" }, { status: 400 });

  const result = await updateAsset(user.id, id, caption);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await deleteAsset(user.id, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

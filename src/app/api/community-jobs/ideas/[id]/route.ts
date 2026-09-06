import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { updateIdea, deleteIdea } from "@/lib/visionaer-service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { title, description } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || typeof description !== "string") {
    return NextResponse.json({ error: "Titel und Beschreibung erforderlich" }, { status: 400 });
  }

  const result = await updateIdea(user.id, id, { title, description });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await deleteIdea(user.id, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

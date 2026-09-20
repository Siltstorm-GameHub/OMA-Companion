import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { updateTrainingSession, deleteTrainingSession } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** PATCH { title?, description?, startAt?, capacity? } — Coach des Termins oder Moderator/Admin. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { title, description, startAt, capacity } = await req.json().catch(() => ({}));
  if (startAt !== undefined && typeof startAt !== "string") return NextResponse.json({ error: "Ungültige Startzeit" }, { status: 400 });
  if (capacity !== undefined && capacity !== null && typeof capacity !== "number") {
    return NextResponse.json({ error: "Ungültige Kapazität" }, { status: 400 });
  }

  const result = await updateTrainingSession(user.id, id, {
    title: typeof title === "string" ? title : undefined,
    description: typeof description === "string" ? description : description === null ? null : undefined,
    startAt: typeof startAt === "string" ? new Date(startAt) : undefined,
    capacity,
  }, { isAdmin: hasMinRole(user.role, "moderator") });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await deleteTrainingSession(user.id, id, { isAdmin: hasMinRole(user.role, "moderator") });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

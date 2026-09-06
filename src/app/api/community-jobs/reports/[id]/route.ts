import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { updateReport, deleteReport } from "@/lib/journalist-service";

/** Autor ODER Admin (dann inkl. optionalem Wechsel des Cover-Bilds `coverAssetId`, z.B. nach Zuschnitt). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { title, bodyMarkdown, coverAssetId } = await req.json().catch(() => ({}));
  if (typeof title !== "string") {
    return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 });
  }
  if (bodyMarkdown !== undefined && typeof bodyMarkdown !== "string") {
    return NextResponse.json({ error: "bodyMarkdown muss ein String sein" }, { status: 400 });
  }

  const isAdmin = hasMinRole(user.role, "moderator");
  const result = await updateReport(
    user.id, id,
    { title, bodyMarkdown, coverAssetId: coverAssetId === undefined ? undefined : (coverAssetId || null) },
    { isAdmin },
  );
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const isAdmin = hasMinRole(user.role, "moderator");
  const result = await deleteReport(user.id, id, { isAdmin });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

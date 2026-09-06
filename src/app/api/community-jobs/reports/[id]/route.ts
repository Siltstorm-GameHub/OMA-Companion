import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { updateReport, deleteReport } from "@/lib/journalist-service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { title, bodyMarkdown } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || typeof bodyMarkdown !== "string") {
    return NextResponse.json({ error: "Titel und Text erforderlich" }, { status: 400 });
  }

  const result = await updateReport(user.id, id, { title, bodyMarkdown });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await deleteReport(user.id, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

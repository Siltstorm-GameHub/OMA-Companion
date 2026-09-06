import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { updateContribution, deleteContribution } from "@/lib/journalist-service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ contribId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { contribId } = await params;
  const { bodyMarkdown } = await req.json().catch(() => ({}));
  if (typeof bodyMarkdown !== "string") return NextResponse.json({ error: "Text erforderlich" }, { status: 400 });

  const result = await updateContribution(user.id, contribId, bodyMarkdown);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ contribId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { contribId } = await params;
  const result = await deleteContribution(user.id, contribId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

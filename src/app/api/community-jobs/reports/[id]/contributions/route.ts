import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { addContribution } from "@/lib/journalist-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { bodyMarkdown } = await req.json().catch(() => ({}));
  if (typeof bodyMarkdown !== "string") {
    return NextResponse.json({ error: "Text erforderlich" }, { status: 400 });
  }

  const result = await addContribution(user.id, id, bodyMarkdown);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

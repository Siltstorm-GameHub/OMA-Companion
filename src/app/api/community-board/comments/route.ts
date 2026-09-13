import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { addComment, listComments } from "@/lib/community-board-comment-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") ?? "";
  const entityId = searchParams.get("entityId") ?? "";
  if (!entityType || !entityId) return NextResponse.json({ error: "entityType und entityId erforderlich" }, { status: 400 });

  const result = await listComments(entityType, entityId, user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { entityType, entityId, bodyMarkdown } = await req.json().catch(() => ({}));
  if (typeof entityType !== "string" || typeof entityId !== "string" || typeof bodyMarkdown !== "string") {
    return NextResponse.json({ error: "entityType, entityId und Text erforderlich" }, { status: 400 });
  }

  const result = await addComment(user.id, entityType, entityId, bodyMarkdown);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

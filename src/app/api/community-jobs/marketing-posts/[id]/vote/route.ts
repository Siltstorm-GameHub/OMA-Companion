import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { voteMarketingPost, unvoteMarketingPost } from "@/lib/marketing-manager-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await voteMarketingPost(user.id, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const result = await unvoteMarketingPost(user.id, id);
  return NextResponse.json(result);
}

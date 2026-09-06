import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createMarketingPost } from "@/lib/marketing-manager-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const posts = await prisma.marketingPost.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { votes: true } } },
  });
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { eventId, caption, assetId } = await req.json().catch(() => ({}));
  if (typeof eventId !== "string" || typeof caption !== "string") {
    return NextResponse.json({ error: "Event und Text erforderlich" }, { status: 400 });
  }

  const result = await createMarketingPost(user.id, {
    eventId, caption, assetId: typeof assetId === "string" ? assetId : undefined,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

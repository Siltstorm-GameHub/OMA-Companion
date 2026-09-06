import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.jobMediaAsset.findUnique({ where: { id }, select: { authorId: true } });
  if (!asset || asset.authorId !== user.id) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const votes = await prisma.jobMediaAssetVote.findMany({
    where: { assetId: id },
    include: { voter: { select: { id: true, username: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ votes });
}

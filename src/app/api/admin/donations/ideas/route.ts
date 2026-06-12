import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("moderator");
  const ideas = await prisma.poolIdea.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(ideas);
}

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { title, description, estimatedCost } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Titel ist Pflicht" }, { status: 400 });
  }
  const idea = await prisma.poolIdea.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      estimatedCost: estimatedCost ? Number(estimatedCost) : null,
    },
  });
  return NextResponse.json(idea);
}

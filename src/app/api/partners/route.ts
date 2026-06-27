import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";

export async function GET() {
  const partners = await prisma.partner.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(partners);
}

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const body = (await req.json()) as { name: string; twitchLogin: string; logoUrl: string; order?: number };
  const partner = await prisma.partner.create({
    data: {
      name: body.name,
      twitchLogin: body.twitchLogin.trim().toLowerCase(),
      logoUrl: body.logoUrl,
      order: body.order ?? 0,
    },
  });
  return NextResponse.json(partner, { status: 201 });
}

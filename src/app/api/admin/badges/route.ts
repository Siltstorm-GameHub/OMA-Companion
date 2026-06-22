import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const session = await auth();
  const adminId = (session?.user as { id?: string })?.id;
  if (!adminId) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json() as {
    icon?: string;
    name?: string;
    desc?: string;
    category?: string;
    coins?: number;
  };

  if (!body.icon?.trim() || !body.name?.trim() || !body.desc?.trim()) {
    return NextResponse.json({ error: "icon, name und desc sind Pflichtfelder" }, { status: 400 });
  }

  const badge = await prisma.customBadge.create({
    data: {
      id:        randomUUID(),
      icon:      body.icon.trim(),
      name:      body.name.trim(),
      desc:      body.desc.trim(),
      category:  body.category?.trim() ?? "special",
      coins:     Math.max(0, body.coins ?? 0),
      createdBy: adminId,
    },
  });

  return NextResponse.json({ badge });
}

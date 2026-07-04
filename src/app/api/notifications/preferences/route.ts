import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_PREFS = {
  badge:     true,
  quest:     true,
  event:     true,
  points:    true,
  clip:      true,
  admin:     true,
  server:    true,
  discordDm: true,
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  const prefs = { ...DEFAULT_PREFS, ...JSON.parse(user?.notificationPrefs || "{}") };
  return NextResponse.json(prefs);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<typeof DEFAULT_PREFS>;

  // Nur erlaubte Keys übernehmen
  const allowed = Object.keys(DEFAULT_PREFS) as (keyof typeof DEFAULT_PREFS)[];
  const cleaned: Partial<typeof DEFAULT_PREFS> = {};
  for (const key of allowed) {
    if (typeof body[key] === "boolean") cleaned[key] = body[key];
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });
  const current = JSON.parse(user?.notificationPrefs || "{}");
  const merged = { ...current, ...cleaned };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: JSON.stringify(merged) },
  });

  return NextResponse.json({ ok: true, prefs: { ...DEFAULT_PREFS, ...merged } });
}

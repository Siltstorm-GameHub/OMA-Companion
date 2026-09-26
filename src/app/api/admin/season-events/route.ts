// Admin: Saison-Events (Halloween, Weihnachten) anlegen, Zeitfenster ändern, ein-/ausschalten, entfernen

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { isSeasonKey } from "@/lib/dnd/season-events";
import { resetSeasonCache } from "@/lib/dnd/season-server";

export const dynamic = "force-dynamic";

const range = z.object({ startsAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)), endsAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)) });

async function list() {
  return prisma.dndSeasonEvent.findMany({ orderBy: { startsAt: "desc" } });
}

export async function GET() {
  await requireRole("admin");
  return NextResponse.json(await list());
}

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  const p = range.safeParse(body);
  if (!p.success || !isSeasonKey(body?.key)) return NextResponse.json({ error: "Ungültige Angaben." }, { status: 400 });
  const startsAt = new Date(p.data.startsAt);
  const endsAt = new Date(p.data.endsAt);
  if (Number.isNaN(+startsAt) || Number.isNaN(+endsAt) || endsAt <= startsAt) return NextResponse.json({ error: "Das Ende muss nach dem Start liegen." }, { status: 400 });
  await prisma.dndSeasonEvent.create({ data: { key: body.key, startsAt, endsAt } });
  resetSeasonCache();
  return NextResponse.json(await list());
}

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const data: { startsAt?: Date; endsAt?: Date; active?: boolean } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.startsAt === "string") data.startsAt = new Date(body.startsAt);
  if (typeof body.endsAt === "string") data.endsAt = new Date(body.endsAt);
  if ((data.startsAt && Number.isNaN(+data.startsAt)) || (data.endsAt && Number.isNaN(+data.endsAt))) return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
  try { await prisma.dndSeasonEvent.update({ where: { id }, data }); } catch { return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 }); }
  resetSeasonCache();
  return NextResponse.json(await list());
}

export async function DELETE(req: NextRequest) {
  await requireRole("admin");
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  await prisma.dndSeasonEvent.deleteMany({ where: { id } });
  resetSeasonCache();
  return NextResponse.json(await list());
}

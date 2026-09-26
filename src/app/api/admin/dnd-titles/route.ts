// Admin: Ehrentitel des OMA-Quest-Münzen-Ladens anlegen, bearbeiten, entfernen

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { titleItems } from "@/lib/dnd/coin-shop";

export const dynamic = "force-dynamic";

const fields = {
  name: z.string().trim().min(2).max(30),
  icon: z.string().trim().min(1).max(8),
  desc: z.string().trim().max(120),
  price: z.number().int().min(0).max(100000),
  active: z.boolean(),
};

async function list() {
  await titleItems(); // füllt den Katalog beim ersten Aufruf
  return prisma.dndTitleDef.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function GET() {
  await requireRole("admin");
  return NextResponse.json(await list());
}

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const p = z.object({ ...fields, active: fields.active.default(true) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Ungültige Angaben." }, { status: 400 });
  if (await prisma.dndTitleDef.findUnique({ where: { name: p.data.name } })) return NextResponse.json({ error: "Diesen Titel gibt es schon." }, { status: 400 });
  await prisma.dndTitleDef.create({ data: { ...p.data, sortOrder: await prisma.dndTitleDef.count() } });
  return NextResponse.json(await list());
}

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const p = z.object({ id: z.string(), name: fields.name.optional(), icon: fields.icon.optional(), desc: fields.desc.optional(), price: fields.price.optional(), active: fields.active.optional() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Ungültige Angaben." }, { status: 400 });
  const { id, ...data } = p.data;
  try { await prisma.dndTitleDef.update({ where: { id }, data }); } catch { return NextResponse.json({ error: "Nicht gefunden oder Name schon vergeben." }, { status: 400 }); }
  return NextResponse.json(await list());
}

/** Entfernt einen Titel aus dem Angebot; wer ihn schon besitzt, behält ihn. */
export async function DELETE(req: NextRequest) {
  await requireRole("admin");
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  await prisma.dndTitleDef.deleteMany({ where: { id } });
  return NextResponse.json(await list());
}

import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { z } from "zod";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { resolveStoreId } from "@/lib/blob-store";
import { HUB_DOWNLOAD_CATEGORIES } from "@/lib/hub-downloads";

const categoryKeys = HUB_DOWNLOAD_CATEGORIES.map((c) => c.key) as [string, ...string[]];

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).nullish(),
  category: z.enum(categoryKeys).optional(),
  version: z.string().trim().max(40).nullish(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().min(-10000).max(10000).optional(),
});

async function guard() {
  const user = await getSessionUser();
  return user && hasMinRole(user.role, "moderator") ? user : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });
  const d = parsed.data;

  const item = await prisma.hubDownload
    .update({
      where: { id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(d.description !== undefined && { description: d.description || null }),
        ...(d.category !== undefined && { category: d.category }),
        ...(d.version !== undefined && { version: d.version || null }),
        ...(d.published !== undefined && { published: d.published }),
        ...(d.sortOrder !== undefined && { sortOrder: d.sortOrder }),
      },
    })
    .catch(() => null);
  if (!item) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  const { id } = await params;
  const item = await prisma.hubDownload.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  await prisma.hubDownload.delete({ where: { id } });
  // Datei im Blob-Speicher mit entfernen; ein Fehler hier soll das Löschen des Eintrags nicht verhindern
  try {
    const storeId = resolveStoreId();
    await del(item.fileUrl, storeId ? { storeId } : undefined);
  } catch (err) {
    console.error("[hub-downloads DELETE] Blob konnte nicht gelöscht werden", err);
  }
  return NextResponse.json({ ok: true });
}

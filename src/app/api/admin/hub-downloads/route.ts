import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { HUB_DOWNLOAD_CATEGORIES, HUB_DOWNLOAD_MAX_BYTES, HUB_DOWNLOAD_PREFIX } from "@/lib/hub-downloads";

const categoryKeys = HUB_DOWNLOAD_CATEGORIES.map((c) => c.key) as [string, ...string[]];

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullish(),
  category: z.enum(categoryKeys),
  version: z.string().trim().max(40).nullish(),
  fileUrl: z.string().url(),
  fileName: z.string().trim().min(1).max(200),
  fileSize: z.number().int().nonnegative().max(HUB_DOWNLOAD_MAX_BYTES),
  mimeType: z.string().trim().min(1).max(120),
  published: z.boolean().optional(),
});

/** Nur Dateien aus unserem Blob-Ordner zulassen, sonst ließe sich jede beliebige URL als Download eintragen. */
function isOwnBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith(`/${HUB_DOWNLOAD_PREFIX}`)
    );
  } catch {
    return false;
  }
}

async function guard() {
  const user = await getSessionUser();
  return user && hasMinRole(user.role, "moderator") ? user : null;
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  const items = await prisma.hubDownload.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });
  const d = parsed.data;
  if (!isOwnBlobUrl(d.fileUrl)) return NextResponse.json({ error: "Ungültige Datei-URL" }, { status: 400 });

  const item = await prisma.hubDownload.create({
    data: {
      title: d.title,
      description: d.description || null,
      category: d.category,
      version: d.version || null,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      published: d.published ?? true,
      createdById: user.id,
    },
  });
  return NextResponse.json(item);
}

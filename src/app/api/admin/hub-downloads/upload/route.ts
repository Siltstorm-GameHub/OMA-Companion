import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { HUB_DOWNLOAD_ALLOWED_TYPES, HUB_DOWNLOAD_MAX_BYTES, HUB_DOWNLOAD_PREFIX } from "@/lib/hub-downloads";

/**
 * Direct-to-Blob-Upload für OMA-Hub-Downloads: der Browser lädt die Datei direkt zu
 * Vercel Blob, diese Route stellt nur das kurzlebige Upload-Token aus. Größe und Typ
 * erzwingt Vercel Blob anhand des Tokens selbst. Der Datensatz (HubDownload) wird erst
 * danach über POST /api/admin/hub-downloads angelegt.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 });

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Fester Ordner und kein "..": `pathname` kommt vom Client
        if (!pathname.startsWith(HUB_DOWNLOAD_PREFIX) || pathname.includes("..")) {
          throw new Error("Ungültiger Zielpfad");
        }
        return {
          allowedContentTypes: HUB_DOWNLOAD_ALLOWED_TYPES,
          maximumSizeInBytes: HUB_DOWNLOAD_MAX_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload-Token fehlgeschlagen" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/roles";
import { requireActiveFotograf } from "@/lib/fotograf-service";
import { CLIP_MAX_BYTES, CLIP_ALLOWED_TYPES } from "@/lib/upload-limits";

/**
 * Direct-to-Blob-Upload für Fotograf-Video-Clips: die Datei geht vom Browser
 * direkt zu Vercel Blob statt durch diese Funktion — Video-Dateien sprengen
 * sonst schnell das Body-Limit von Vercel Functions. Diese Route liefert nur
 * das kurzlebige Upload-Token; Größen-/Typ-Grenze (CLIP_MAX_BYTES/-TYPES)
 * erzwingt Vercel Blob selbst anhand des Tokens, nicht diese Route — ein
 * manipulierter Client kann die Grenze also nicht umgehen.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 });

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await requireActiveFotograf(user.id))) {
          throw new Error("Du bist gerade kein aktiver Fotograf");
        }
        // Fester Ziel-Ordner statt frei wählbarem Pfad — sonst wäre `pathname`
        // ein Path-Traversal-Vektor (siehe gleiche Überlegung in /api/upload).
        if (!pathname.startsWith("community-job-clip/")) {
          throw new Error("Ungültiger Zielpfad");
        }
        return {
          allowedContentTypes: [...CLIP_ALLOWED_TYPES],
          maximumSizeInBytes: CLIP_MAX_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload-Token fehlgeschlagen" }, { status: 400 });
  }
}

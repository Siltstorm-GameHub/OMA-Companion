import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/roles";

/**
 * Bild-Upload nach Vercel Blob.
 *
 * Erwartet multipart/form-data mit den Feldern:
 *   file  — die Bilddatei
 *   kind  — "event-cover" | "profile-banner" | "badge" | "collectible"
 *
 * Antwort: { url: string }
 *
 * Authentifizierung gegen den Blob-Store — der SDK kennt zwei Wege und prüft
 * sie in dieser Reihenfolge (siehe getBlobCredentials im SDK):
 *
 *   1. OIDC: VERCEL_OIDC_TOKEN + Store-ID. Das ist der Weg neuerer Stores;
 *      Vercel injiziert das OIDC-Token auf Deployments automatisch.
 *   2. Statisches Schreib-Token: BLOB_READ_WRITE_TOKEN. Älterer Weg.
 *
 * Beide werden unterstützt, weil sonst je nach Alter des Stores gar nichts geht.
 */

/**
 * Store-ID auflösen.
 *
 * Der SDK liest ausschliesslich `BLOB_STORE_ID`. Vercel stellt den
 * Store-Variablen beim Verbinden aber ein frei wählbares Präfix voran — heißt
 * das Präfix z.B. "BLOB_READ_WRITE_TOKEN", landet die ID in
 * `BLOB_READ_WRITE_TOKEN_STORE_ID` und der SDK findet sie nicht. Darum suchen
 * wir selbst und übergeben sie explizit an put().
 */
function resolveStoreId(): string | undefined {
  const direct = process.env.BLOB_STORE_ID?.trim();
  if (direct) return direct;

  // Beliebiges Präfix: die erste Variable nehmen, die auf _STORE_ID endet und
  // zum Blob-Store gehört.
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_STORE_ID") && key.includes("BLOB") && value?.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * Prüft, ob ein gangbarer Weg zum Store konfiguriert ist, und benennt sonst den
 * konkreten Fehler.
 *
 * Die Format-Prüfung auf `vercel_blob_` ist kein Selbstzweck: Vercel legt neben
 * dem Store mehrere Variablen mit ähnlichem Namen an, darunter einen
 * WEBHOOK_PUBLIC_KEY. Trägt man den versehentlich als Schreib-Token ein, würde
 * der SDK ihn anstandslos annehmen und erst beim Upload mit einer nichtssagenden
 * Meldung scheitern.
 */
function checkBlobCredentials(): { ok: true } | { ok: false; reason: string } {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (token) {
    if (!token.startsWith("vercel_blob_")) {
      return {
        ok: false,
        reason:
          "BLOB_READ_WRITE_TOKEN ist gesetzt, hat aber nicht das Format eines Blob-Tokens " +
          "(erwartet: beginnt mit 'vercel_blob_'). Vermutlich wurde der WEBHOOK_PUBLIC_KEY " +
          "oder die STORE_ID eingetragen — beide taugen nicht zur Authentifizierung.",
      };
    }
    return { ok: true };
  }

  // Kein statisches Token → OIDC-Weg. Vercel injiziert VERCEL_OIDC_TOKEN auf
  // Deployments selbst; lokal kommt es über `vercel env pull`.
  if (process.env.VERCEL_OIDC_TOKEN?.trim() && resolveStoreId()) return { ok: true };

  return {
    ok: false,
    reason:
      "Keine Blob-Zugangsdaten gefunden. Erwartet wird entweder BLOB_READ_WRITE_TOKEN " +
      "oder VERCEL_OIDC_TOKEN zusammen mit der Store-ID.",
  };
}

/** Was hochgeladen werden darf, und wer. Bewusst eine Whitelist: `kind` landet
 *  im Blob-Pfad, ein freier String wäre ein Path-Traversal-Vektor. */
const KINDS = {
  "event-cover":    { minRole: "moderator", maxBytes: 4_000_000 },
  "profile-banner": { minRole: "user",      maxBytes: 3_000_000 },
  "badge":          { minRole: "admin",     maxBytes: 1_000_000 },
  "collectible":    { minRole: "admin",     maxBytes: 2_000_000 },
} as const;

type Kind = keyof typeof KINDS;

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const ROLE_ORDER = ["user", "moderator", "admin"];

export async function POST(req: NextRequest) {
  const credentials = checkBlobCredentials();
  if (!credentials.ok) {
    return NextResponse.json({ error: credentials.reason }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 });

  const kind = String(form.get("kind") ?? "");
  if (!(kind in KINDS)) {
    return NextResponse.json({ error: "Unbekannter Upload-Typ" }, { status: 400 });
  }
  const cfg = KINDS[kind as Kind];

  // requireRole() wird hier bewusst nicht verwendet: das redirected, was in
  // einem fetch() aus dem Client als undurchsichtiger Fehler ankäme.
  if (ROLE_ORDER.indexOf(user.role) < ROLE_ORDER.indexOf(cfg.minRole)) {
    return NextResponse.json({ error: "Keine Berechtigung für diesen Upload" }, { status: 403 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Nicht unterstütztes Format (${file.type || "unbekannt"}). Erlaubt: PNG, JPEG, WebP, GIF.` },
      { status: 415 }
    );
  }
  if (file.size > cfg.maxBytes) {
    return NextResponse.json(
      { error: `Datei zu gross (max. ${Math.round(cfg.maxBytes / 1_000_000)} MB).` },
      { status: 413 }
    );
  }

  // Dateiname wird nie vom Client übernommen — nur die Endung, und die aus dem
  // geprüften MIME-Typ abgeleitet.
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }[file.type]!;
  const path = `${kind}/${randomUUID()}.${ext}`;

  // Store-ID explizit mitgeben: bei OIDC-Auth sucht der SDK sie unter
  // BLOB_STORE_ID, Vercel legt sie aber unter dem Store-Präfix ab.
  const storeId = resolveStoreId();

  try {
    const blob = await put(path, file, {
      access: "public",
      contentType: file.type,
      // Vercel Blob hängt sonst ein Zufallssuffix an — wir vergeben mit der
      // UUID bereits einen kollisionsfreien Namen.
      addRandomSuffix: false,
      ...(storeId ? { storeId } : {}),
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[upload] Vercel Blob fehlgeschlagen:", err);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 502 });
  }
}

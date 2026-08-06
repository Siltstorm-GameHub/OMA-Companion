/** Gemeinsame Bausteine für alle OG-/Share-Karten (next/og).
 *
 *  Wichtig für alles in dieser Datei: gerendert wird nicht vom Browser, sondern
 *  von Satori. Daraus folgen drei harte Regeln, die man beim Erweitern beachten
 *  muss, weil Verstösse nicht crashen, sondern still falsch aussehen:
 *
 *    1. Nur Flexbox. `display: grid` wird ignoriert.
 *    2. Jedes Element mit mehr als einem Kind braucht explizit `display: flex`.
 *    3. Keine CSS-Variablen — `var(--teal)` kann Satori nicht auflösen.
 *       Deshalb kommen alle Farben aus BRAND (lib/brand.ts) als Literale.
 *
 *  Ausserdem gilt ein Bundle-Limit von 500 KB pro Bild inklusive eingebetteter
 *  Assets. Das Logo wird darum als 256er-Variante geladen (~28 KB), nie als
 *  Original (2,24 MB).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND, BRAND_NAME } from "@/lib/brand";

/** Lädt das Logo als data-URI. Satori kann keine relativen URLs auflösen,
 *  Bilder müssen also entweder absolut erreichbar oder eingebettet sein —
 *  eingebettet ist robuster, weil es beim Build ohne laufenden Server klappt. */
export async function loadLogoDataUri(): Promise<string> {
  const buf = await readFile(join(process.cwd(), "public", "brand", "logo-256.png"));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** Lädt ein beliebiges Bild (z.B. Discord-Avatar) als data-URI, mit Deckel
 *  gegen aufgeblähte Quellen. Satori könnte externe URLs zwar selbst laden,
 *  aber jeder Fehlschlag dort reisst die ganze Karte mit — lieber selbst holen
 *  und im Zweifel ohne Bild weiterrendern. Von mehreren OG-/Discord-Bildrouten
 *  geteilt (Profilkarte, Sieger-Podium). */
export async function loadRemoteImageDataUri(
  url: string | null | undefined,
  maxBytes = 300_000
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Deckel gegen aufgeblähte Bilder: das 500-KB-Bundle-Limit von next/og gilt
    // für die gesamte Karte, Logo und Schrift eingerechnet.
    if (buf.byteLength > maxBytes) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Der Marken-Rahmen: Verlauf, diagonale Farbbänder, Akzentlinien, Fusszeile.
 *  Bewusst dieselbe Bildsprache wie EventCoverDefault, damit Share-Karten und
 *  In-App-Cover als eine Familie lesbar sind. */
export function OgFrame({
  children,
  footer = "OMA COMPANION",
}: {
  children: React.ReactNode;
  footer?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: `linear-gradient(135deg, ${BRAND.coverFrom} 0%, ${BRAND.coverTo} 100%)`,
        fontFamily: "sans-serif",
      }}
    >
      {/* Teal-Wash links */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, width: "48%", height: "100%",
          display: "flex",
          background: `linear-gradient(to right, rgba(20,184,166,0.20), rgba(20,184,166,0))`,
        }}
      />
      {/* Rot-Wash rechts */}
      <div
        style={{
          position: "absolute", top: 0, right: 0, width: "48%", height: "100%",
          display: "flex",
          background: `linear-gradient(to left, rgba(139,32,32,0.22), rgba(139,32,32,0))`,
        }}
      />
      {/* Obere Akzentlinie */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: 4,
          display: "flex",
          background: `linear-gradient(to right, rgba(20,184,166,0), ${BRAND.teal}, rgba(139,32,32,0.8), rgba(139,32,32,0))`,
        }}
      />
      {/* Seitenmarker */}
      <div style={{ position: "absolute", top: 280, left: 0, width: 6, height: 70, display: "flex", background: BRAND.teal, borderRadius: 3 }} />
      <div style={{ position: "absolute", top: 280, right: 0, width: 6, height: 70, display: "flex", background: BRAND.red, borderRadius: 3 }} />

      {/* Inhalt */}
      <div
        style={{
          position: "relative", flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "0 72px",
        }}
      >
        {children}
      </div>

      {/* Fusszeile */}
      <div
        style={{
          position: "relative", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 18, paddingBottom: 34,
        }}
      >
        <div style={{ display: "flex", width: 150, height: 1, background: `linear-gradient(to right, rgba(20,184,166,0), ${BRAND.teal})` }} />
        <div style={{ display: "flex", width: 6, height: 6, borderRadius: 3, background: BRAND.teal }} />
        <div style={{ display: "flex", fontSize: 17, fontWeight: 700, letterSpacing: 7, color: BRAND.textFaint }}>
          {footer}
        </div>
        <div style={{ display: "flex", width: 6, height: 6, borderRadius: 3, background: BRAND.red }} />
        <div style={{ display: "flex", width: 150, height: 1, background: `linear-gradient(to left, rgba(139,32,32,0), ${BRAND.red})` }} />
      </div>
    </div>
  );
}

/** Logo + Wortmarke — die Kopfzeile der meisten Karten. */
export function OgBrandRow({ logo, subtitle }: { logo: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 34 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori rendert kein next/image */}
      <img src={logo} width={72} height={72} alt="" style={{ borderRadius: 16 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 4, color: BRAND.text, textTransform: "uppercase" }}>
          {BRAND_NAME}
        </div>
        {subtitle ? (
          <div style={{ display: "flex", fontSize: 20, color: BRAND.textDim, marginTop: 4 }}>{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}

/** Kleines Label-Pill, z.B. für Genre, Format oder Status. */
export function OgPill({ text, tone = "teal" }: { text: string; tone?: "teal" | "red" | "neutral" }) {
  const map = {
    teal:    { bg: "rgba(20,184,166,0.14)",  border: "rgba(20,184,166,0.42)",  fg: BRAND.tealLight },
    red:     { bg: "rgba(139,32,32,0.20)",   border: "rgba(139,32,32,0.55)",   fg: "#f87171" },
    neutral: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.16)", fg: BRAND.textDim },
  }[tone];
  return (
    <div
      style={{
        display: "flex", alignItems: "center", padding: "9px 20px", borderRadius: 999,
        background: map.bg, border: `1px solid ${map.border}`,
        fontSize: 21, fontWeight: 600, color: map.fg,
      }}
    >
      {text}
    </div>
  );
}

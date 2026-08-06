import { ImageResponse } from "next/og";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { BRAND, OG_SIZE } from "@/lib/brand";
import { OgFrame, OgBrandRow, loadLogoDataUri, loadRemoteImageDataUri } from "@/lib/og";

/**
 * Animiertes Sieger-Podium für Discord-Ergebnis-Ankündigungen.
 *
 * Eigenständig wie die anderen /api/og/-Routen — fragt Event und Top-3 selbst
 * aus der DB ab, discord-events.ts muss nur die Event-ID kennen.
 *
 * Architektur — bewusst NUR EIN next/og-Aufruf pro Request:
 * Next's mitgeliefertes sharp (next/dist/compiled/@vercel/og, eine eigene
 * Kopie, nicht das Projekt-sharp aus package.json) stürzte in diesem
 * Windows-Devserver reproduzierbar ab, sobald mehrere ImageResponse-Aufrufe
 * im selben Request liefen ("colourspace: parameter space not set" bzw. ein
 * harter Prozessabsturz ohne jede Fehlermeldung — nicht per try/catch
 * abfangbar, da nativer Crash). Ein einzelner Aufruf ist dagegen so stabil
 * wie die vier anderen produktiven OG-Routen dieser App.
 *
 * Deshalb: next/og rendert nur EIN statisches Basisbild (Podium, Avatare,
 * Namen). Die Animation entsteht danach rein über das Projekt-sharp — jeder
 * Frame ist dieselbe Basis plus ein per SVG gerendertes Konfetti-Overlay an
 * leicht verschobener Position, zusammengefügt per sharp(buffers,
 * {join:{animated:true}}).gif(...). Dieser Mechanismus wurde isoliert
 * getestet (2-Frame-Testfall: korrekte Seitenanzahl/-dauer im Ergebnis-GIF)
 * und lief in dieser Route auch stabil, solange kein zweiter next/og-Aufruf
 * im selben Request dazukam.
 */

const FRAME_COUNT = 6;
const FRAME_DELAY_MS = 380;

const PLACE_COLORS = {
  1: { block: "#f59e0b", ring: "#fde68a" }, // Gold
  2: { block: "#9ca3af", ring: "#e5e7eb" }, // Silber
  3: { block: "#a06a3c", ring: "#e7c8a4" }, // Bronze
} as const;

const PODIUM_HEIGHTS = { 1: 210, 2: 150, 3: 110 } as const;

const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  left: 60 + ((i * 83) % 1080),
  size: 8 + (i % 3) * 4,
  color: [BRAND.teal, BRAND.red, "#f59e0b", BRAND.tealLight][i % 4],
  phase: (i * 0.61) % 1,
  speed: 0.7 + (i % 3) * 0.15,
  shape: i % 2 === 0 ? "circle" : "rect",
}));

/** Konfetti-Overlay für einen Frame als SVG — von sharp direkt auf das
 *  Basisbild komponiert. Nur Position/Deckkraft ändern sich pro Frame, das
 *  erzeugt den Fall+Blink-Effekt ohne next/og erneut aufzurufen. */
function confettiOverlaySvg(frameIndex: number): Buffer {
  const t = frameIndex / FRAME_COUNT;
  const pieces = CONFETTI.map((c) => {
    const cycle = (c.phase + t * c.speed) % 1;
    const top = 40 + cycle * 480;
    const opacity = cycle < 0.1 ? cycle / 0.1 : cycle > 0.85 ? (1 - cycle) / 0.15 : 0.85;
    const clamped = Math.max(0, Math.min(0.85, opacity)).toFixed(2);
    return c.shape === "circle"
      ? `<circle cx="${c.left + c.size / 2}" cy="${top + c.size / 2}" r="${c.size / 2}" fill="${c.color}" opacity="${clamped}"/>`
      : `<rect x="${c.left}" y="${top}" width="${c.size}" height="${c.size}" fill="${c.color}" opacity="${clamped}" rx="3"/>`;
  }).join("");
  return Buffer.from(
    `<svg width="${OG_SIZE.width}" height="${OG_SIZE.height}" xmlns="http://www.w3.org/2000/svg">${pieces}</svg>`
  );
}

interface PodiumEntry {
  place: 1 | 2 | 3;
  name: string;
  avatar: string | null;
}

function PodiumBlock({ entry }: { entry: PodiumEntry }) {
  const cfg = PLACE_COLORS[entry.place];
  const h = PODIUM_HEIGHTS[entry.place];
  const avatarSize = entry.place === 1 ? 84 : 68;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 220 }}>
      {entry.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori rendert kein next/image
        <img
          src={entry.avatar}
          width={avatarSize}
          height={avatarSize}
          alt=""
          style={{ borderRadius: avatarSize / 2, border: `4px solid ${cfg.ring}`, marginBottom: 12 }}
        />
      ) : (
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2,
            background: "rgba(255,255,255,0.08)", border: `4px solid ${cfg.ring}`,
            marginBottom: 12, fontSize: avatarSize * 0.4, fontWeight: 800, color: cfg.ring,
          }}
        >
          {entry.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div
        style={{
          display: "flex", fontSize: 24, fontWeight: 700, color: BRAND.text,
          marginBottom: 14, maxWidth: 200, textAlign: "center", justifyContent: "center",
        }}
      >
        {entry.name.length > 16 ? entry.name.slice(0, 15).trimEnd() + "…" : entry.name}
      </div>
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
          width: 200, height: h, borderRadius: "12px 12px 0 0",
          background: `linear-gradient(180deg, ${cfg.block}, ${cfg.block}cc)`,
          border: `1px solid ${cfg.ring}55`, paddingBottom: 14,
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#1a1206" }}>{entry.place}</div>
      </div>
    </div>
  );
}

async function staticFallback(logo: string): Promise<Response> {
  const png = new ImageResponse(
    (
      <OgFrame footer="ERGEBNIS">
        <OgBrandRow logo={logo} subtitle="Ergebnis" />
        <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color: BRAND.text }}>🏆 Ergebnis</div>
        <div style={{ display: "flex", fontSize: 25, color: BRAND.textDim, marginTop: 14 }}>
          Details in der Companion App.
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE }
  );
  return new Response(png.body, { headers: { "Content-Type": "image/png" } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event
    .findUnique({ where: { id }, select: { title: true, hidden: true, finalRankingJson: true } })
    .catch(() => null);

  const placeIds: string[] = (() => {
    if (!event?.finalRankingJson) return [];
    try {
      const arr = JSON.parse(event.finalRankingJson) as unknown;
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, 3) : [];
    } catch {
      return [];
    }
  })();

  const logo = await loadLogoDataUri();

  if (!event || event.hidden || placeIds.length === 0) {
    return staticFallback(logo);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: placeIds } },
    select: { id: true, name: true, username: true, image: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const entries: PodiumEntry[] = await Promise.all(
    placeIds.map(async (userId, i) => {
      const u = userById.get(userId);
      const name = u?.name ?? u?.username ?? "?";
      const avatar = await loadRemoteImageDataUri(u?.image ?? null, 150_000);
      return { place: (i + 1) as 1 | 2 | 3, name, avatar };
    })
  );

  // Reihenfolge links→rechts: 2 – 1 – 3, damit der Sieger visuell in der Mitte steht.
  const ordered = [2, 1, 3]
    .map((place) => entries.find((e) => e.place === place))
    .filter((e): e is PodiumEntry => Boolean(e));

  // Genau EIN next/og-Aufruf — siehe Architektur-Kommentar oben.
  const base = new ImageResponse(
    (
      <OgFrame footer="ERGEBNIS">
        <OgBrandRow logo={logo} subtitle="Ergebnis" />
        <div style={{ display: "flex", fontSize: 42, fontWeight: 800, color: BRAND.text, marginBottom: 32, maxWidth: 950 }}>
          🏆 {event.title.length > 42 ? event.title.slice(0, 41).trimEnd() + "…" : event.title}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
          {ordered.map((entry) => (
            <PodiumBlock key={entry.place} entry={entry} />
          ))}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE }
  );
  const baseBuffer = Buffer.from(await base.arrayBuffer());

  // Animation ab hier nur noch über das Projekt-sharp (kein next/og mehr).
  const frames: Buffer[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const frame = await sharp(baseBuffer)
      .composite([{ input: confettiOverlaySvg(i), top: 0, left: 0 }])
      .png()
      .toBuffer();
    frames.push(frame);
  }

  const gif = await sharp(frames, { join: { animated: true } })
    .gif({ delay: frames.map(() => FRAME_DELAY_MS), loop: 0 })
    .toBuffer();

  return new Response(new Uint8Array(gif), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

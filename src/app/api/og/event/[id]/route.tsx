import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { BRAND, OG_SIZE } from "@/lib/brand";
import { OgFrame, OgBrandRow, OgPill, loadLogoDataUri } from "@/lib/og";
import { formatLabel, genreLabel } from "@/lib/event-placeholders";

/**
 * Share-Karte für ein Event.
 *
 * Warum ein Route Handler und nicht die opengraph-image.tsx-Dateikonvention:
 * In Next 16.2.6 liefert eine opengraph-image-Datei innerhalb einer Route-Gruppe
 * durchgängig 404 — reproduzierbar auch mit einer leeren Testgruppe, statisch wie
 * dynamisch. Da die gesamte App unter (dashboard) liegt, wäre die Konvention hier
 * nicht nutzbar. Der Route Handler unter /api/og/ steht ausserhalb jeder Gruppe
 * und wird über generateMetadata() der jeweiligen Seite verlinkt.
 *
 * Satori-Regeln beim Erweitern beachten — siehe Kopfkommentar in lib/og.tsx.
 */

const STATUS_TEXT: Record<string, string> = {
  open:     "Anmeldung offen",
  active:   "Läuft gerade",
  umfrage:  "Umfrage läuft",
  closed:   "Geschlossen",
  finished: "Beendet",
};

function formatStart(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  }).format(date) + " Uhr";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const logo = await loadLogoDataUri();

  // Fällt die DB aus, ist eine generische Karte besser als ein 500er: Discord
  // cached einen Fehlschlag und zeigt für den Link dauerhaft gar nichts an.
  const event = await prisma.event
    .findUnique({
      where: { id },
      select: {
        title: true, game: true, startAt: true, genre: true, format: true,
        status: true, hidden: true, maxPlayers: true,
        _count: { select: { registrations: true } },
        series: { select: { name: true } },
      },
    })
    .catch(() => null);

  // Versteckte Events sind bewusst nicht öffentlich — die Karte darf ihren
  // Titel auch dann nicht preisgeben, wenn jemand die OG-URL direkt aufruft.
  if (!event || event.hidden) {
    return new ImageResponse(
      (
        <OgFrame>
          <OgBrandRow logo={logo} subtitle="Companion App" />
          <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: BRAND.text }}>Event</div>
          <div style={{ display: "flex", fontSize: 27, color: BRAND.textDim, marginTop: 14 }}>
            Details in der Companion App.
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE }
    );
  }

  const pills: { text: string; tone: "teal" | "red" | "neutral" }[] = [];
  if (event.genre)  pills.push({ text: genreLabel(event.genre), tone: "teal" });
  if (event.format) pills.push({ text: formatLabel(event.format), tone: "neutral" });
  pills.push({
    text: STATUS_TEXT[event.status] ?? event.status,
    tone: event.status === "active" ? "red" : "neutral",
  });
  pills.push({
    text: event.maxPlayers
      ? `${event._count.registrations}/${event.maxPlayers} Plätze`
      : `${event._count.registrations} angemeldet`,
    tone: "neutral",
  });

  // Lange Titel würden die Karte sprengen: Satori bricht zwar um, aber drei
  // Zeilen 58er-Schrift kollidieren mit der Fusszeile.
  const title = event.title.length > 58 ? event.title.slice(0, 57).trimEnd() + "…" : event.title;

  return new ImageResponse(
    (
      <OgFrame>
        <OgBrandRow logo={logo} subtitle={event.series?.name ?? "Event"} />

        <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: BRAND.text, lineHeight: 1.12, marginBottom: 16 }}>
          {title}
        </div>

        {event.game ? (
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: BRAND.tealLight, marginBottom: 10 }}>
            {event.game}
          </div>
        ) : null}

        <div style={{ display: "flex", fontSize: 25, color: BRAND.textDim, marginBottom: 30 }}>
          {formatStart(event.startAt)}
        </div>

        <div style={{ display: "flex", gap: 13 }}>
          {pills.map((p) => <OgPill key={p.text} text={p.text} tone={p.tone} />)}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE }
  );
}

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function OverlaySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; streamer?: string }>;
}) {
  const { id: eventId } = await params;
  const { token, streamer: streamerId } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, format: true, overlayToken: true },
  });

  if (!event || !token || event.overlayToken !== token) notFound();

  // `streamer` kommt aus stream-register (kennt den eingeloggten User) — ohne den Parameter
  // (sehr alter Link) bleiben Flip-Kachel-Rückseite, Lieblingsspiele und Abzeichen einfach
  // aus der Auswahl, statt die Seite zum Absturz zu bringen.
  const streamer = streamerId
    ? await prisma.user.findUnique({
        where: { id: streamerId },
        select: { id: true, name: true, username: true, favoriteGamesJson: true, showcaseBadgesJson: true },
      })
    : null;
  const jsonArrayHasEntries = (json: string | null | undefined) => {
    try { return json ? (JSON.parse(json) as unknown[]).length > 0 : false; } catch { return false; }
  };
  const hasFavorites = jsonArrayHasEntries(streamer?.favoriteGamesJson);
  // Das Abzeichen-Element zeigt neben den selbst gewählten Showcase-Abzeichen auch aktuell
  // gehaltene Wanderpokale (siehe lib/overlay-badges.ts) — ohne diesen zweiten Check verschwand
  // die Option komplett für User, die zwar Pokale halten, aber keine Showcase-Abzeichen gewählt haben.
  const trophyCount = streamer ? await prisma.wanderpocalHolder.count({ where: { userId: streamer.id } }).catch(() => 0) : 0;
  const hasBadges = jsonArrayHasEntries(streamer?.showcaseBadgesJson) || trophyCount > 0;

  return (
    <SettingsClient
      eventId={event.id}
      eventTitle={event.title}
      format={event.format}
      token={token}
      streamerId={streamer?.id ?? null}
      hasFavorites={hasFavorites}
      hasBadges={hasBadges}
    />
  );
}

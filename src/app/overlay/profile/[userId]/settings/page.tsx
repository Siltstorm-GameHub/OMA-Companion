import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function ProfileOverlaySettingsPage({
  params, searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { userId } = await params;
  const { token } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, overlayToken: true, favoriteGamesJson: true, showcaseBadgesJson: true },
  });
  if (!user || !token || user.overlayToken !== token) notFound();

  const jsonArrayHasEntries = (json: string | null) => {
    try { return json ? (JSON.parse(json) as unknown[]).length > 0 : false; } catch { return false; }
  };
  // Das Abzeichen-Element zeigt neben den selbst gewählten Showcase-Abzeichen auch aktuell
  // gehaltene Wanderpokale (siehe lib/overlay-badges.ts) — ohne diesen zweiten Check verschwand
  // die Option komplett für User, die zwar Pokale halten, aber keine Showcase-Abzeichen gewählt haben.
  const trophyCount = await prisma.wanderpocalHolder.count({ where: { userId: user.id } }).catch(() => 0);
  const hasBadges = jsonArrayHasEntries(user.showcaseBadgesJson) || trophyCount > 0;

  return (
    <SettingsClient
      userId={user.id}
      displayName={user.username ?? user.name ?? "Unbekannt"}
      token={token}
      hasFavorites={jsonArrayHasEntries(user.favoriteGamesJson)}
      hasBadges={hasBadges}
    />
  );
}

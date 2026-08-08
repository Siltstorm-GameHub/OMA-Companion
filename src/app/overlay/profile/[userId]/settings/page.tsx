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

  return (
    <SettingsClient
      userId={user.id}
      displayName={user.username ?? user.name ?? "Unbekannt"}
      token={token}
      hasFavorites={jsonArrayHasEntries(user.favoriteGamesJson)}
      hasBadges={jsonArrayHasEntries(user.showcaseBadgesJson)}
    />
  );
}

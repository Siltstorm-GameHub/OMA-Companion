import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import BotPreviewShell from "@/components/BotPreviewShell";
import { loadProfileData } from "@/lib/profile-data";
import { listKnownCoaches } from "@/lib/community-job-access";
import { levelTitle } from "@/lib/job-badges";
import ProfileView from "../ProfileView";
import ProfileBackLink from "../ProfileBackLink";
import ProfileActions from "../ProfileActions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user
    .findUnique({ where: { id }, select: { name: true, username: true, rankPoints: true, reputationLevel: true } })
    .catch(() => null);

  const name = user?.username ?? user?.name ?? "Mitglied";
  const title = `${name} – Old Masters Ally`;
  const description = user
    ? `Ansehen ${levelTitle(user.reputationLevel)} · ${user.rankPoints.toLocaleString("de-DE")} Rangpunkte`
    : "Profil bei Old Masters Ally";

  return {
    title,
    description,
    // Die Share-Karte zeigt Name und Avatar und ist ohne Login abrufbar — das
    // ist für Discord-Vorschauen gewollt. noindex verhindert, dass Profile
    // zusätzlich in Suchmaschinen landen. Zum Aufheben diese Zeile entfernen.
    robots: { index: false, follow: false },
    openGraph: { title, description, images: [`/api/og/profile/${id}`] },
    twitter: { card: "summary_large_image", title, description, images: [`/api/og/profile/${id}`] },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session  = await auth();
  const viewerId = session?.user?.id;

  if (!session) {
    // Ohne Session kommt nur ein von (dashboard)/layout.tsx bereits geprüfter
    // Link-Vorschau-Bot hierher — die teure Zusammenstellung braucht der nicht,
    // nur die Meta-Tags oben (Name, Ansehen, Avatar für die Discord-Linkvorschau).
    return <BotPreviewShell />;
  }

  // Eigenes Profil → weiterleiten
  if (viewerId === id) redirect("/profile");

  const [data, coaches, captainOf] = await Promise.all([
    loadProfileData(id),
    listKnownCoaches(),
    // Squads, in denen der Betrachter Captain ist und die Person noch nicht Mitglied ist.
    viewerId
      ? prisma.squadMembership.findMany({
          where: { userId: viewerId, role: "captain", squad: { memberships: { none: { userId: id } } } },
          select: { squad: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
  ]);
  if (!data) notFound();

  return (
    <ProfileView
      data={data}
      isOwn={false}
      viewerId={viewerId}
      topBar={<div><ProfileBackLink /></div>}
      actions={
        <ProfileActions
          userId={id}
          displayName={data.displayName}
          isCoach={coaches.some(c => c.userId === id)}
          captainSquads={captainOf.map(m => m.squad)}
        />
      }
    />
  );
}

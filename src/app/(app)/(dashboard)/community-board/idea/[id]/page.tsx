import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { enrichIdeaEntries, ideaFeedInclude, toIdeaFeedEntry } from "@/lib/idea-feed";
import IdeaPageClient from "./IdeaPageClient";

export const dynamic = "force-dynamic";

/** Eigene Seite für eine Idee — mit teilbarem Link, Ergebnis, Status und Kommentaren. */
export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) notFound();

  const { id } = await params;
  const idea = await prisma.communityIdea.findUnique({ where: { id }, include: ideaFeedInclude() });
  if (!idea || idea.hiddenByAdminAt) notFound();

  // Datumsfelder für die Client-Komponente serialisieren.
  const [entry] = await enrichIdeaEntries([toIdeaFeedEntry(idea, user.id)]);
  return <IdeaPageClient entry={JSON.parse(JSON.stringify(entry))} />;
}

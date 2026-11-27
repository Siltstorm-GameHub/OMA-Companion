import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { PageHeader } from "@/components/ui/PageHeader";
import BoardSectionNav from "@/components/community/BoardSectionNav";
import CoachRatingSection from "./CoachRatingSection";
import BoardClient from "./BoardClient";

export const metadata = { title: "Community-Board | OMA" };

/**
 * Community-Board: Feed der Community wie in Social Media — hier entsteht auch alles (Verfassen-Feld mit allen
 * Werkzeugen der Community-Jobs). Rechts das Büro in kurz, das volle Büro unter /community-board/buero.
 * Links: ?neu=beitrag|idee|anleitung&event=<id> öffnet das Verfassen-Feld vorbefüllt (compose.ts).
 */
export default async function CommunityBoardPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?notice=login_required&callbackUrl=/community-board");

  return (
    <div className="px-4 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">
      <BoardSectionNav active="feed" />
      <PageHeader title="Community-Board" description="Teile Bilder, Clips, Berichte und Ideen — bewerte, was dir gefällt." />
      <BoardClient me={{ id: me.id, name: me.username ?? me.name ?? "du", image: me.image ?? null }} coachCard={<CoachRatingSection />} />
    </div>
  );
}

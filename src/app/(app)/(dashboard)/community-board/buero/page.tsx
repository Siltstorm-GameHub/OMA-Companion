import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { PageHeader } from "@/components/ui/PageHeader";
import BoardSectionNav from "@/components/community/BoardSectionNav";
import BueroPanel from "./BueroPanel";

export const metadata = { title: "Büro · Community-Board | OMA" };

/**
 * Büro der Community-Jobs: Gehalt, Empfehlungen, Bildwünsche, Kampagnen, eigene Beiträge und Entwürfe, Coaching.
 * Bis 2026-11 ein Reiter im Profil (/profile?tab=community_jobs bzw. ?job=… leiten hierher um).
 * "?job=coach" öffnet den Coach-Reiter, "?ansicht=gehalt" den Gehalts-Reiter.
 */
export default async function BueroPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?notice=login_required&callbackUrl=/community-board/buero");

  return (
    <div className="px-4 pb-5 pt-0 sm:p-6 max-w-4xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">
      <BoardSectionNav active="buero" />
      <PageHeader title="Büro" description="Deine Community-Jobs: was zu tun ist, was du verdienst und deine Werkzeuge." />
      <BueroPanel />
    </div>
  );
}

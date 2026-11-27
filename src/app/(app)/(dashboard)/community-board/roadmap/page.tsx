import { notFound } from "next/navigation";
import { Rocket } from "@/components/icons";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { getRoadmap } from "@/lib/roadmap-service";
import { PageHeader } from "@/components/ui/PageHeader";
import BoardSectionNav from "@/components/community/BoardSectionNav";
import RoadmapClient from "./RoadmapClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roadmap · Community-Board | OMA" };

/**
 * Roadmap: was aus den Ideen der Community wird und woran das Team arbeitet (lib/roadmap-service.ts).
 * Team (Mods/Admins) legt eigene Punkte an und postet Infos mit Screenshots.
 */
export default async function RoadmapPage() {
  const user = await getSessionUser();
  if (!user) notFound();
  const { entries, topWeek, topMonth } = await getRoadmap(user.id);

  return (
    <div className="px-4 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">
      <BoardSectionNav active="roadmap" />
      <PageHeader title={<span className="flex items-center gap-2"><Rocket className="size-6 text-primary" /> Roadmap</span>}
        description="Ihr habt gewünscht — das wird daraus. Und woran das Team gerade arbeitet." />
      <RoadmapClient entries={entries} topWeek={topWeek} topMonth={topMonth} isTeam={hasMinRole(user.role, "moderator")} />
    </div>
  );
}

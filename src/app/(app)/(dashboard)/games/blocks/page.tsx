// ============================================
// /games/blocks — OMA Blocks im Games-Bereich (Übersicht · GameSwipe · Blocks · Shop, siehe GamesSectionTabs):
// Start Solo und Versus, laufende Blocks-Events, Belohnungen, Ranglisten (components/blocks/BlocksHubPanel).
// ============================================
// Bis 2026-11 lag das direkt unter /games — dort ist jetzt die Games-Übersicht. Das Solo-Spiel selbst liegt
// unter /games/blocks/solo. Früher lag der Hub unter /gems; alte Adressen leiten um (next.config.ts).

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BlocksHubPanel from "@/components/blocks/BlocksHubPanel";
import GamesSectionTabs from "@/components/games/GamesSectionTabs";

export const metadata = {
  title: "OMA Blocks | Games | OMA",
};

export default async function BlocksPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/games/blocks");
  }
  const userId = session.user.id;

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-5xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">
      <GamesSectionTabs active="blocks" />
      <BlocksHubPanel userId={userId} />
    </div>
  );
}

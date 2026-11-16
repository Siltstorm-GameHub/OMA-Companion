// ============================================
// /games — Reiter „Spielen“ des Games-Bereichs (Spielen · Spieleliste · Shop, siehe GamesSectionTabs):
// OMA Blocks (components/blocks/BlocksHubPanel) — Solo und Versus, Belohnungen, Ranglisten.
// ============================================
// Spieleliste und „Gerade im Angebot“ liegen im Reiter Spieleliste (/spiele), das tägliche Glücksrad
// im Shop-Reiter (/shop#gluecksrad). Früher lag der Hub unter /gems; alte Adressen leiten hierher um
// (next.config.ts).

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BlocksHubPanel from "@/components/blocks/BlocksHubPanel";
import GamesSectionTabs from "@/components/games/GamesSectionTabs";

export const metadata = {
  title: "OMA Blocks | Games | OMA",
};

export default async function GamesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/games");
  }
  const userId = session.user.id;

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      <GamesSectionTabs active="spielen" userId={userId} />
      <BlocksHubPanel userId={userId} />
    </div>
  );
}

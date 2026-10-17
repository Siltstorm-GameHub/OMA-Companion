import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { auth } from "@/auth";
import { getCampaignLeaderboard } from "@/lib/gems/leaderboard";
import LeaderboardList from "@/components/gems/LeaderboardList";

export const metadata = {
  title: "Rangliste | OMA Gems | OMA",
};

// Vollständige Rangliste der Kampagne inkl. Endlos-Turm (im Hub stehen nur die ersten Plätze).
export default async function GemsLeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/gems/leaderboard");
  }
  const rows = await getCampaignLeaderboard();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link href="/gems" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück zu OMA Gems
      </Link>
      <h1 className="text-lg font-black text-white">Rangliste</h1>
      <LeaderboardList rows={rows} viewerId={session.user.id} />
    </div>
  );
}

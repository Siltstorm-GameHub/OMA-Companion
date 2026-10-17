import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { auth } from "@/auth";
import {
  getCampaignLeaderboard,
  getDailyChallengeLeaderboard,
  getSeasonLeaderboard,
  getWeeklyClimbLeaderboard,
  toLeaderboardEntry,
  toSeasonEntry,
} from "@/lib/gems/leaderboard";
import LeaderboardList, { LEADERBOARD_TEXTS, type LeaderboardView } from "@/components/gems/LeaderboardList";

export const metadata = {
  title: "Rangliste | OMA Gems | OMA",
};

const VIEWS = Object.keys(LEADERBOARD_TEXTS) as LeaderboardView[];

// Vollständige Ranglisten (im Hub stehen nur die ersten Plätze der Saison): Saison (höchste
// Endlos-Stufe im Monat), Bestwert (über alle Saisons), Diese Woche, Heute (Tages-Herausforderung).
export default async function GemsLeaderboardPage({ searchParams }: { searchParams: Promise<{ ansicht?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/gems/leaderboard");
  }
  const { ansicht } = await searchParams;
  const view: LeaderboardView = VIEWS.includes(ansicht as LeaderboardView) ? (ansicht as LeaderboardView) : "saison";

  const rows =
    view === "woche"
      ? await getWeeklyClimbLeaderboard()
      : view === "heute"
        ? await getDailyChallengeLeaderboard()
        : view === "gesamt"
          ? (await getCampaignLeaderboard()).map(toLeaderboardEntry)
          : (await getSeasonLeaderboard()).map(toSeasonEntry);
  const texts = LEADERBOARD_TEXTS[view];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link href="/gems" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück zu OMA Gems
      </Link>
      <h1 className="font-display text-lg font-black text-white">Rangliste</h1>
      <nav className="flex gap-1 glass rounded-xl p-1 w-fit" aria-label="Ranglisten-Ansicht">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={v === "saison" ? "/gems/leaderboard" : `/gems/leaderboard?ansicht=${v}`}
            aria-current={v === view ? "page" : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              v === view ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25" : "text-gray-400 hover:text-white"
            }`}
          >
            {LEADERBOARD_TEXTS[v].label}
          </Link>
        ))}
      </nav>
      <LeaderboardList rows={rows} viewerId={session.user.id} note={texts.note} emptyText={texts.emptyText} absentText={texts.absentText} />
    </div>
  );
}

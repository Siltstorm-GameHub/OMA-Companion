import { redirect } from "next/navigation";

// Die Rangliste lebt jetzt im Community-Reiter von /battle-cards.
export default function BattleCardsLeaderboardRedirect() {
  redirect("/battle-cards?tab=community");
}

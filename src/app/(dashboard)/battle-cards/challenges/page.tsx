import { redirect } from "next/navigation";

// Herausforderungen leben jetzt im Community-Reiter von /battle-cards.
export default function BattleChallengesRedirect() {
  redirect("/battle-cards?tab=community");
}

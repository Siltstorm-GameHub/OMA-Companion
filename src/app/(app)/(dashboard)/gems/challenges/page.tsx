import { redirect } from "next/navigation";

// Herausforderungen leben jetzt im Community-Reiter von /battle-cards.
export default function BattleChallengesRedirect() {
  redirect("/gems?tab=arena");
}

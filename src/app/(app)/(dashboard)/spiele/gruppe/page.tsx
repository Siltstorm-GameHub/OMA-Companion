import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { listApprovedGames, listGroupCandidates } from "@/lib/games/service";
import GroupFinderClient from "./GroupFinderClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Was zocken wir? · Spieleliste | OMA",
  description: "Spiele finden, die alle in eurer Runde haben.",
};

export default async function GroupFinderPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?notice=login_required&callbackUrl=/spiele/gruppe");

  const [games, members] = await Promise.all([listApprovedGames(user.id), listGroupCandidates()]);
  // Eigener Eintrag immer dabei, auch wenn er nicht unter den 500 zuletzt Aktiven ist
  if (!members.some(m => m.id === user.id)) {
    members.unshift({ id: user.id, name: user.username ?? user.name ?? "Du", image: user.image });
  }

  return <GroupFinderClient games={games} members={members} meId={user.id} />;
}

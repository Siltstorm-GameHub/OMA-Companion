import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { loadProfileData } from "@/lib/profile-data";
import ProfileView from "./ProfileView";
import type { ProfileTabKey } from "./ProfileTabs";

/** Startreiter aus der URL: "?tab=achievements|activity|community_jobs|settings" (alt: "notifications"), "?job=<jobKey>" öffnet die Community-Jobs. */
function tabFromParams(p: { tab?: string; job?: string }): ProfileTabKey {
  if (p.job) return "community_jobs";
  if (p.tab === "community_jobs") return "community_jobs";
  if (p.tab === "achievements" || p.tab === "erfolge") return "achievements";
  if (p.tab === "activity" || p.tab === "aktivitaet") return "activity";
  if (p.tab === "settings" || p.tab === "einstellungen" || p.tab === "notifications") return "settings";
  return "overview";
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string; job?: string }> }) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const [params, data] = await Promise.all([searchParams, loadProfileData(me.id)]);
  if (!data) redirect("/login");

  return <ProfileView data={data} isOwn viewerId={me.id} initialTab={tabFromParams(params)} />;
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { loadProfileData } from "@/lib/profile-data";
import ProfileView from "./ProfileView";
import type { ProfileTabKey } from "./ProfileTabs";

/** Startreiter aus der URL: "?tab=achievements|activity|settings" (alt: "notifications"). */
function tabFromParams(p: { tab?: string }): ProfileTabKey {
  if (p.tab === "achievements" || p.tab === "erfolge") return "achievements";
  if (p.tab === "activity" || p.tab === "aktivitaet") return "activity";
  if (p.tab === "settings" || p.tab === "einstellungen" || p.tab === "notifications") return "settings";
  return "overview";
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string; job?: string; compose?: string }> }) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  // Das Büro der Community-Jobs liegt seit 2026-11 im Community-Board — alte Links (Benachrichtigungen,
  // Lesezeichen) leiten dorthin: "?job=…&compose=<eventId>" öffnet das Verfassen-Feld zum Event.
  const params = await searchParams;
  if (params.compose) redirect(`/community-board?neu=beitrag&event=${encodeURIComponent(params.compose)}`);
  if (params.job) redirect(`/community-board/buero?job=${encodeURIComponent(params.job)}`);
  if (params.tab === "community_jobs") redirect("/community-board/buero");

  const data = await loadProfileData(me.id);
  if (!data) redirect("/login");

  return <ProfileView data={data} isOwn viewerId={me.id} initialTab={tabFromParams(params)} />;
}

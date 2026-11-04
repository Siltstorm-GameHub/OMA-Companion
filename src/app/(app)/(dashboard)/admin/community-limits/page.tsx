import { requireRole, hasMinRole } from "@/lib/roles";
import { getCommunityLimits } from "@/lib/community-event-limits";
import CommunityLimitsEditor from "./CommunityLimitsEditor";

export default async function CommunityLimitsPage() {
  const user = await requireRole("moderator");
  const limits = await getCommunityLimits();
  return <CommunityLimitsEditor initial={limits} canEdit={hasMinRole(user.role, "admin")} />;
}

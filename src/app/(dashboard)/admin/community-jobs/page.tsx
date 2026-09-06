import { requireRole } from "@/lib/roles";
import { COMMUNITY_JOBS } from "@/lib/community-jobs";
import {
  getEffectiveCommunityJobs, getAnnouncementChannelOverrides, getVoteBonusConfig, getTestModeEnabled,
} from "@/lib/community-job-config";
import CommunityJobsAdminPanel from "./CommunityJobsAdminPanel";

export default async function AdminCommunityJobsPage() {
  await requireRole("moderator");

  const [effectiveJobs, channelOverrides, voteBonus, testModeEnabled] = await Promise.all([
    getEffectiveCommunityJobs(), getAnnouncementChannelOverrides(), getVoteBonusConfig(), getTestModeEnabled(),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-white">Community-Jobs</h1>
        <p className="text-xs text-gray-500 mt-0.5">Bewerbungen, Mitglieder, Anfechtungen und Einstellungen für Journalist, Fotograf, Marketing Manager, Coach und Visionär.</p>
      </div>
      <CommunityJobsAdminPanel
        jobs={COMMUNITY_JOBS.map(j => ({ key: j.key, label: j.label, emoji: j.emoji }))}
        effectiveSlots={Object.fromEntries(effectiveJobs.map(j => [j.key, j.maxSlots]))}
        channelOverrides={channelOverrides}
        voteBonus={voteBonus}
        testModeEnabled={testModeEnabled}
      />
    </div>
  );
}

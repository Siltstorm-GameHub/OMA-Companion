import { requireRole } from "@/lib/roles";
import { COMMUNITY_JOBS } from "@/lib/community-jobs";
import {
  getAnnouncementChannelOverrides, getVoteBonusTiers, getDailyContributionLimit,
} from "@/lib/community-job-config";
import CommunityJobsAdminPanel from "./CommunityJobsAdminPanel";
import AdminContentSection from "./AdminContentSection";
import AdminJobsNav from "./AdminJobsNav";
import JobHealthBlock from "./JobHealthBlock";

export default async function AdminCommunityJobsPage() {
  await requireRole("moderator");

  const [channelOverrides, voteBonus, dailyLimit] = await Promise.all([
    getAnnouncementChannelOverrides(), getVoteBonusTiers(), getDailyContributionLimit(),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-white">Community-Jobs</h1>
        <p className="text-xs text-gray-500 mt-0.5">Offene Jobs für alle: Anfechtungen, Tageslimit, Ansehen und Einstellungen für Journalist, Fotograf, Marketing Manager, Coach und Visionär.</p>
      </div>
      <AdminJobsNav />
      <JobHealthBlock />
      <CommunityJobsAdminPanel
        jobs={COMMUNITY_JOBS.map(j => ({ key: j.key, label: j.label, emoji: j.emoji }))}
        channelOverrides={channelOverrides}
        voteBonus={voteBonus}
        dailyLimit={dailyLimit}
      />
      <AdminContentSection />
    </div>
  );
}

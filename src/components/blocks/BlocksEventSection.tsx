// ============================================
// OMA Blocks — Bereich auf der Event-Seite (Live-Turnier oder Community-Challenge)
// ============================================

import { getChallengeProgress } from "@/lib/blocks/challenge";
import BlocksTournamentPanel from "./BlocksTournamentPanel";
import ChallengeCard from "./ChallengeCard";

export default async function BlocksEventSection({
  eventId, viewerId, canLead, hasTournament, hasChallenge,
}: { eventId: string; viewerId: string; canLead: boolean; hasTournament: boolean; hasChallenge: boolean }) {
  if (hasTournament) {
    return (
      <div className="mb-5">
        <BlocksTournamentPanel eventId={eventId} viewerId={viewerId} canLead={canLead} />
      </div>
    );
  }
  if (!hasChallenge) return null;
  const progress = await getChallengeProgress(eventId, viewerId);
  if (!progress) return null;
  return (
    <div className="mb-5">
      <ChallengeCard p={progress} />
    </div>
  );
}

import CommunityBoardClient from "./CommunityBoardClient";
import { PageHeader } from "@/components/ui/PageHeader";
import CoachRatingSection from "./CoachRatingSection";

export default function CommunityBoardPage() {
  return (
    <div className="max-w-2xl lg:max-w-6xl mx-auto space-y-4 px-4 py-6">
      <PageHeader
        title="Community-Board"
        description="Berichte, Fotos, Werbung und Ideen aus den Community-Jobs — bewerte, was dir gefällt, oder mach selbst mit."
      />
      <CoachRatingSection />
      <CommunityBoardClient />
    </div>
  );
}

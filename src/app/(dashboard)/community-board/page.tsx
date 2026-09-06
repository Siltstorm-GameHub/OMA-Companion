import CommunityBoardClient from "./CommunityBoardClient";
import CoachRatingSection from "./CoachRatingSection";

export default function CommunityBoardPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-bold text-white">Community-Board</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Berichte, Fotos, Werbung und Ideen der Community-Job-Inhaber — bewerte, was dir gefällt.
        </p>
      </div>
      <CoachRatingSection />
      <CommunityBoardClient />
    </div>
  );
}

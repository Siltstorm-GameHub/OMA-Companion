"use client";
import AuroraBackground from "@/components/AuroraBackground";
import TopNewsFeed, { type NewsItem } from "@/components/TopNewsFeed";
import MobileTopBar from "@/components/MobileTopBar";
import BottomNav from "@/components/BottomNav";

const newsItems: NewsItem[] = [
  { id: "a", icon: "members", text: "Test-Ticker-Eintrag" },
];

export default function DevRepro() {
  return (
    <div className="min-h-screen text-white" style={{ background: "#0d0d0f" }}>
      <AuroraBackground />
      <TopNewsFeed items={newsItems} />
      <MobileTopBar />
      <main
        className="min-w-0 px-0 pb-24 lg:pb-10 pt-[5.75rem] lg:pt-[100px]"
        style={{ position: "relative", zIndex: 2 }}
      >
        <div style={{ height: 2000, padding: 20 }}>Repro content, scroll area</div>
      </main>
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

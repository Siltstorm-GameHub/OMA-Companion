import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";
import MobileTopBar from "@/components/MobileTopBar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { BackToTop } from "@/components/BackToTop";
import AuroraBackground from "@/components/AuroraBackground";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen text-white" style={{ background: "#06100e" }}>

      {/* ── Aurora Hintergrund ───────────────────────────────────── */}
      <AuroraBackground />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Top Bar + Drawer */}
      <MobileTopBar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 pb-24 lg:pb-28 min-w-0">
        {children}
      </main>

      {/* Onboarding für neue User */}
      <OnboardingModal />

      {/* Back to top */}
      <BackToTop />
    </div>
  );
}

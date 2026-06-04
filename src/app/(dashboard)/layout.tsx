import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import MobileTopBar from "@/components/MobileTopBar";
import { OnboardingModal } from "@/components/OnboardingModal";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen text-white" style={{ background: "var(--bg-base, #080c18)" }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile Top Bar + Drawer */}
      <MobileTopBar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto
        pt-14 md:pt-0
        pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav />

      {/* Onboarding für neue User */}
      <OnboardingModal />
    </div>
  );
}

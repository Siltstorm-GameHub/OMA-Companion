import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import MobileTopBar from "@/components/MobileTopBar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { BackToTop } from "@/components/BackToTop";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen text-white" style={{ background: "var(--bg-base, #080c18)" }}>

      {/* ── Tiefenhintergrund ──────────────────────────────────────── */}
      <div aria-hidden="true" className="depth-bg fixed inset-0 overflow-hidden pointer-events-none select-none" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 bg-grid-lines" />
        <div className="depth-bg__blob absolute rounded-full blur-[160px]" style={{ width: "600px", height: "500px", top: "25%", left: "30%" }} />
        <div className="depth-bg__vignette absolute inset-0" />
        <div className="depth-bg__line-top absolute top-0 inset-x-0 h-px" />
        <div className="depth-bg__line-mid absolute inset-x-0 h-px" style={{ top: "50%" }} />
      </div>

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

      {/* Back to top */}
      <BackToTop />
    </div>
  );
}

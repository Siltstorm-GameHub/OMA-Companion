import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DynamicNotch from "@/components/DynamicNotch";
import { OnboardingModal } from "@/components/OnboardingModal";
import { BackToTop } from "@/components/BackToTop";
import AuroraBackground from "@/components/AuroraBackground";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen text-white" style={{ background: "#06100e" }}>

      {/* ── Aurora Hintergrund ───────────────────────────────────── */}
      <AuroraBackground />

      {/* Dynamic Notch — top center, both mobile + desktop */}
      <DynamicNotch />

      {/* Main Content — padding-top compensates for notch height */}
      <main className="pt-20 pb-24 min-w-0">
        {children}
      </main>

      {/* Onboarding für neue User */}
      <OnboardingModal />

      {/* Back to top */}
      <BackToTop />
    </div>
  );
}

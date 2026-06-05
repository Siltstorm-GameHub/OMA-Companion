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
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none select-none" style={{ zIndex: 1 }}>
        {/* Globales Linien-Grid */}
        <div className="absolute inset-0 bg-grid-lines" />
        {/* Dritter Blob — Mitte, sehr subtil */}
        <div className="absolute rounded-full blur-[160px]" style={{
          width: "600px", height: "500px",
          top: "25%", left: "30%",
          background: "radial-gradient(ellipse, rgba(20,184,166,0.06) 0%, transparent 70%)",
        }} />
        {/* Vignette — Ränder abdunkeln, Zentrum leuchtet */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 110% 110% at 55% 45%, transparent 25%, rgba(2,6,5,0.60) 100%)"
        }} />
        {/* Top-Lichtlinie */}
        <div className="absolute top-0 inset-x-0 h-px" style={{
          background: "linear-gradient(90deg, transparent 5%, rgba(20,184,166,0.12) 30%, rgba(20,184,166,0.22) 50%, rgba(20,184,166,0.12) 70%, transparent 95%)"
        }} />
        {/* Horizontale Tiefen-Linie mid-screen */}
        <div className="absolute inset-x-0 h-px" style={{
          top: "50%",
          background: "linear-gradient(90deg, transparent 15%, rgba(20,184,166,0.04) 40%, rgba(20,184,166,0.07) 50%, rgba(20,184,166,0.04) 60%, transparent 85%)"
        }} />
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

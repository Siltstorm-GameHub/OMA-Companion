"use client";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trophy, CalendarDays, Scroll, Star, Swords, Zap, AlertTriangle } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const FEATURES = [
  { icon: CalendarDays, color: "text-blue-400",   bg: "bg-blue-500/10   border-blue-500/20",   title: "Events",          desc: "Alle Discord-Events synchronisiert, mit Anmeldung und Punkten." },
  { icon: Scroll,       color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20", title: "Quests",          desc: "Monatliche Challenges für Voice, Chat und Events." },
  { icon: Star,         color: "text-amber-400",   bg: "bg-amber-500/10  border-amber-500/20",  title: "Punkte & Ränge",  desc: "Von Neuling bis Grandmaster — Aktivität zahlt sich aus." },
  { icon: Trophy,       color: "text-rose-400",    bg: "bg-rose-500/10   border-rose-500/20",   title: "Rangliste",       desc: "Tritt gegen die Community an und kämpfe um die Spitze." },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  function handleLogin() {
    setLoading(true);
    signIn("discord", { callbackUrl: "/dashboard" });
  }

  return (
    <main className="min-h-screen lg:flex" style={{ background: "var(--bg-base, #080c18)" }}>
      {/* Hex-Grid hinter allem */}
      <AnimatedBackground />

      {/* ── Linke Seite: Branding ──────────────────────────────────── */}
      <div className="relative hidden lg:flex flex-1 flex-col justify-between p-12 overflow-hidden border-r border-white/[0.06]">
        {/* Glow-Blobs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-violet-500/8 blur-3xl pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/30 shrink-0">
            <Image src="/OMALogoNew.png" alt="OMA" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-black text-white tracking-widest uppercase">Old Masters Ally</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-[10px] text-emerald-500/80 font-semibold tracking-widest uppercase">Online</span>
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10">
          <p className="text-xs font-semibold text-rose-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Swords className="w-3.5 h-3.5" /> Old Masters Discord Community
          </p>
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight mb-5">
            Deine Community.<br />
            <span className="text-gradient-gaming">Deine Erfolge.</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md">
            Verwalte Events, nimm an Turnieren teil und sammle Punkte durch deine Discord-Aktivität.
          </p>
        </div>

        {/* Feature-Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className={`glass card-shine rounded-2xl p-4 border ${bg}`}>
              <div className={`w-8 h-8 rounded-xl ${bg} border flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-xs text-gray-700">© 2025 Old Masters Ally · Companion App</p>
      </div>

      {/* ── Rechte Seite: Login ────────────────────────────────────── */}
      <div className="relative min-h-screen lg:min-h-0 flex items-center justify-center p-6 lg:p-12 lg:w-[440px] overflow-hidden z-10">
        {/* Mobile Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-500/8 blur-3xl pointer-events-none lg:hidden" />

        <div className="w-full max-w-sm">

          {/* Mobile Logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-[0_0_32px_rgba(244,63,94,0.3)] ring-2 ring-rose-500/30 mb-4">
              <Image src="/OMALogoNew.png" alt="OMA" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Old Masters Ally</h1>
            <p className="text-sm text-gray-500 mt-1">Companion App</p>
          </div>

          {/* Login Card */}
          <div className="glass card-shine rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 via-transparent to-violet-500/6 pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent pointer-events-none" />

            <div className="relative">
              {/* Online-Indikator */}
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-xs text-emerald-500/80 font-medium">Server online</span>
              </div>

              <h2 className="text-2xl font-black text-white mb-1">Willkommen zurück</h2>
              <p className="text-sm text-gray-500 mb-8">
                Melde dich mit deinem Discord-Account an.
              </p>

              {/* Auth-Fehler anzeigen */}
              {error && (
                <div className="mb-6 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5">Login fehlgeschlagen</p>
                    <p className="text-red-400/70 font-mono">{error}</p>
                  </div>
                </div>
              )}

              {/* Discord-Button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="group w-full relative overflow-hidden glass-heavy border border-rose-500/30 hover:border-rose-500/50 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-[0_0_24px_rgba(244,63,94,0.15)] hover:shadow-[0_0_32px_rgba(244,63,94,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60"
              >
                {/* Shine sweep on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 pointer-events-none" />
                {/* Rose glow bg */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/15 to-rose-600/10 pointer-events-none" />

                <div className="relative flex items-center gap-3">
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0 text-rose-300">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.053.182.112.245a19.89 19.89 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                  )}
                  <span>{loading ? "Weiterleitung…" : "Mit Discord anmelden"}</span>
                </div>
              </button>

              {/* Features — Mobile */}
              <div className="mt-6 space-y-2.5 lg:hidden">
                {FEATURES.map(({ icon: Icon, color, title }) => (
                  <div key={title} className="flex items-center gap-2.5 text-xs text-gray-500">
                    <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                    {title}
                  </div>
                ))}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-6 pt-5 border-t border-white/[0.06]">
                {[
                  { icon: <Zap className="w-3 h-3 text-amber-400" />, label: "Punkte sammeln" },
                  { icon: <Trophy className="w-3 h-3 text-rose-400" />, label: "Rangliste" },
                  { icon: <Swords className="w-3 h-3 text-purple-400" />, label: "Turniere" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-gray-600">
                    {item.icon} {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-700 mt-4 px-2">
            Durch die Anmeldung stimmst du der Nutzung deiner Discord-Daten zu.
          </p>
        </div>
      </div>
    </main>
  );
}

"use client";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { Trophy, CalendarDays, Scroll, Star, Swords, Users } from "lucide-react";

const FEATURES = [
  {
    icon: CalendarDays,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    title: "Events & Turniere",
    desc: "Alle Discord-Events automatisch synchronisiert, mit Anmeldung und Spielplan-Verwaltung.",
  },
  {
    icon: Scroll,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    title: "Monatliche Quests",
    desc: "Jeden Monat neue Herausforderungen — Voice, Nachrichten, Events und Turniere.",
  },
  {
    icon: Star,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    title: "Punkte & Ränge",
    desc: "Sammle Punkte durch Aktivität. Von Neuling bis Grandmaster — der Weg ist das Ziel.",
  },
  {
    icon: Trophy,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    title: "Rangliste",
    desc: "Sieh wo du im Vergleich zur Community stehst und kämpfe um die Spitze.",
  },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    setLoading(true);
    signIn("discord", { callbackUrl: "/dashboard" });
  }

  return (
    <main className="min-h-screen bg-gray-950 lg:flex lg:flex-row">

      {/* ── Linke Seite: Branding (nur Desktop) ───────────────────── */}
      <div className="relative hidden lg:flex flex-1 flex-col justify-between p-12 overflow-hidden">

        {/* Hintergrund-Glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-rose-900/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-rose-950/30 blur-3xl" />
          {/* Subtiles Grid-Muster */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-rose-900/30 shrink-0">
            <Image src="/OMALogoNew.png" alt="OMA Logo" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">Old Masters Ally</p>
            <p className="text-xs text-gray-500">Companion App</p>
          </div>
        </div>

        {/* Hero-Text — nur auf Desktop sichtbar */}
        <div className="relative hidden lg:block">
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-4">
            Old Masters Discord Community
          </p>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
            Deine Community.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">
              Deine Erfolge.
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md">
            Verwalte Events, nehme an Turnieren teil und sammle Punkte durch deine Discord-Aktivität.
          </p>
        </div>

        {/* Feature-Liste — nur auf Desktop */}
        <div className="relative hidden lg:grid grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="bg-gray-900/60 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="relative hidden lg:block text-xs text-gray-700">
          © 2025 Old Masters Ally · Companion App
        </p>
      </div>

      {/* ── Rechte Seite: Login-Card ──────────────────────────────── */}
      <div className="relative min-h-screen lg:min-h-0 flex items-center justify-center p-6 lg:p-12 lg:w-[420px] lg:border-l lg:border-white/5 overflow-hidden">
        {/* Mobile-only Hintergrund-Glow */}
        <div className="absolute inset-0 pointer-events-none lg:hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-rose-900/15 blur-3xl" />
        </div>
        <div className="w-full max-w-sm">

          {/* Mobile Logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-rose-900/40 mb-4">
              <Image src="/OMALogoNew.png" alt="OMA Logo" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-white">Old Masters Ally</h1>
            <p className="text-sm text-gray-500 mt-1">Companion App</p>
          </div>

          {/* Card */}
          <div className="bg-gray-900 border border-white/8 rounded-2xl p-8 shadow-2xl">

            {/* Online-Indikator */}
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="text-xs text-gray-500">Server online</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Willkommen zurück</h2>
            <p className="text-sm text-gray-500 mb-8">
              Melde dich mit deinem Discord-Account an um fortzufahren.
            </p>

            {/* Discord-Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="group w-full relative overflow-hidden bg-rose-800 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-rose-900/30 hover:shadow-rose-900/50 hover:-translate-y-0.5 active:translate-y-0"
            >
              {/* Hover-Glanz */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />

              {loading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.053.182.112.245a19.89 19.89 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
              )}
              {loading ? "Weiterleitung…" : "Mit Discord anmelden"}
            </button>

            {/* Features — Mobile only */}
            <div className="mt-6 space-y-2 lg:hidden">
              {FEATURES.slice(0, 3).map(({ icon: Icon, color, title }) => (
                <div key={title} className="flex items-center gap-2.5 text-xs text-gray-500">
                  <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                  {title}
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-700 mt-4 px-2">
            Durch die Anmeldung stimmst du zu, dass wir deine Discord-Daten für den Betrieb des Portals verwenden.
          </p>
        </div>
      </div>

    </main>
  );
}

"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { ShieldAlert, ExternalLink, LogIn, CheckSquare, Square } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const RULES = [
  {
    number: "§1",
    title: "Respektvoller Umgang",
    text: "Behandle alle Mitglieder mit Respekt. Beleidigungen, Diskriminierung, Mobbing oder Hassrede sind nicht toleriert und führen zum sofortigen Ausschluss.",
  },
  {
    number: "§2",
    title: "Kein Spam & kein Werbung",
    text: "Keine unerwünschten Werbebotschaften, Einladungslinks zu fremden Servern oder wiederholte Nachrichten. Eigene Inhalte nur im dafür vorgesehenen Kanal teilen.",
  },
  {
    number: "§3",
    title: "Themengerechte Kommunikation",
    text: "Nutze die richtigen Kanäle für deine Nachrichten. Off-Topic-Gespräche gehören in den entsprechenden Off-Topic-Kanal.",
  },
  {
    number: "§4",
    title: "Kein NSFW-Inhalt",
    text: "Das Teilen von anstößigen, expliziten oder unangemessenen Inhalten ist strengstens verboten.",
  },
  {
    number: "§5",
    title: "Discord-Nutzungsbedingungen",
    text: "Alle Mitglieder müssen die Nutzungsbedingungen von Discord einhalten. Verstöße werden gemeldet und führen zum Ausschluss.",
  },
  {
    number: "§6",
    title: "Anweisungen der Moderatoren",
    text: "Anweisungen von Moderatoren und Admins sind zu befolgen. Bei Uneinigkeit wende dich über eine Direktnachricht an einen Admin.",
  },
];

export default function NotMemberClient({ inviteUrl }: { inviteUrl: string | null }) {
  const [accepted, setAccepted] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  function handleLogin() {
    setLoggingIn(true);
    signIn("discord", { callbackUrl: "/dashboard" });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: "var(--bg-base, #080c18)" }}>
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-lg">

        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-[0_0_28px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/30 mb-4">
            <Image src="/OMALogoNew.png" alt="OMA" width={56} height={56} className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <h1 className="text-xl font-black text-white">Kein Serverzugang</h1>
          </div>
          <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
            Dein Discord-Account ist noch kein Mitglied des <span className="text-white font-semibold">Old Masters Ally</span> Discord-Servers.
            Tritt dem Server bei, um die Companion App zu nutzen.
          </p>
        </div>

        {/* Rules Card */}
        <div className="glass card-shine rounded-2xl overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white">Serverregeln</h2>
            <p className="text-xs text-gray-500 mt-0.5">Lies die Regeln sorgfältig durch, bevor du beitrittst.</p>
          </div>

          <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
            {RULES.map(rule => (
              <div key={rule.number} className="px-5 py-3.5 flex gap-3">
                <span className="text-xs font-bold text-rose-500/70 shrink-0 w-6 mt-0.5">{rule.number}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-200 mb-0.5">{rule.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{rule.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Checkbox */}
          <button
            onClick={() => setAccepted(a => !a)}
            className="w-full flex items-center gap-3 px-5 py-4 border-t border-white/[0.06] hover:bg-white/[0.02] transition-colors text-left"
          >
            {accepted
              ? <CheckSquare className="w-5 h-5 text-teal-400 shrink-0" />
              : <Square className="w-5 h-5 text-gray-600 shrink-0" />
            }
            <span className={`text-sm font-medium transition-colors ${accepted ? "text-teal-300" : "text-gray-400"}`}>
              Ich habe die Serverregeln gelesen und akzeptiere sie.
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {inviteUrl ? (
            <a
              href={accepted ? inviteUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!accepted}
              className={`flex items-center justify-center gap-2.5 w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-200 ${
                accepted
                  ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_24px_rgba(99,102,241,0.3)] hover:shadow-[0_0_32px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 active:translate-y-0"
                  : "bg-white/[0.04] text-gray-600 border border-white/[0.06] cursor-not-allowed pointer-events-none"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.053.182.112.245a19.89 19.89 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Old Masters Ally beitreten
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-gray-600">
              Kein Einladungslink konfiguriert — wende dich an einen Admin.
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl text-sm font-medium text-gray-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] transition-colors disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loggingIn ? "Weiterleitung…" : "Bereits beigetreten? Jetzt einloggen"}
          </button>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-gray-700 mt-4 leading-relaxed">
          Falls du gerade erst beigetreten bist, warte einen Moment und klicke dann auf „Jetzt einloggen".
        </p>
      </div>
    </main>
  );
}

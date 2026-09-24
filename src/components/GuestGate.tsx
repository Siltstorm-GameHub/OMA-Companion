"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { Lock, X } from "@/components/icons";
import DiscordLoginButton from "@/components/DiscordLoginButton";
import { isGuestAllowedPath } from "@/lib/guest-access";

// Gemeinsamer Zustand für nicht eingeloggte Besucher: Banner, Modal und alle
// "gesperrten" Links/Buttons hängen daran. Für eingeloggte Nutzer ist der
// Provider inaktiv (isGuest = false) und alles verhält sich wie zuvor.

interface GateOptions {
  /** Ziel, das der Besucher eigentlich öffnen wollte — wird nach dem Login angesteuert. */
  href?: string;
  title?: string;
  message?: string;
}

interface GuestGateValue {
  isGuest: boolean;
  inviteUrl: string | null;
  openGate: (opts?: GateOptions) => void;
}

const GuestGateContext = createContext<GuestGateValue>({
  isGuest: false,
  inviteUrl: null,
  openGate: () => {},
});

export function useGuestGate() {
  return useContext(GuestGateContext);
}

export function GuestGateProvider({
  isGuest, inviteUrl, children,
}: { isGuest: boolean; inviteUrl: string | null; children: ReactNode }) {
  const [opts, setOpts] = useState<GateOptions | null>(null);
  const openGate = useCallback((o?: GateOptions) => setOpts(o ?? {}), []);
  const close = useCallback(() => setOpts(null), []);

  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, close]);

  const value = useMemo(() => ({ isGuest, inviteUrl, openGate }), [isGuest, inviteUrl, openGate]);

  return (
    <GuestGateContext.Provider value={value}>
      {children}
      {isGuest && opts && <GateModal opts={opts} inviteUrl={inviteUrl} onClose={close} />}
    </GuestGateContext.Provider>
  );
}

function DiscordJoinButton({ href, className }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-teal-950 bg-teal-400 hover:bg-teal-300 transition-colors"}
    >
      <Users className="w-4 h-4 shrink-0" />
      Discord beitreten
    </a>
  );
}

function GateModal({ opts, inviteUrl, onClose }: { opts: GateOptions; inviteUrl: string | null; onClose: () => void }) {
  const pathname = usePathname();
  const callbackUrl = opts.href && opts.href.startsWith("/") ? opts.href : (pathname || "/dashboard");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(4,8,8,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-gate-title"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ background: "var(--nav-dropdown-bg, #0b0f0f)", border: "1px solid rgba(20,184,166,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 mx-auto rounded-full flex items-center justify-center"
          style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)" }}>
          <Lock className="w-5 h-5 text-rose-400" />
        </div>
        <h2 id="guest-gate-title" className="mt-3 text-base font-bold text-white">
          {opts.title ?? "Nur für Mitglieder"}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          {opts.message ?? "Dafür brauchst du einen Platz auf unserem Discord-Server. So kommst du rein:"}
        </p>

        <ol className="mt-5 space-y-3 text-left">
          {inviteUrl && (
            <li className="flex items-start gap-3">
              <span className="mt-2 w-5 h-5 shrink-0 rounded-full bg-teal-500/15 border border-teal-500/30 text-[11px] font-bold text-teal-300 flex items-center justify-center">1</span>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1.5">Tritt dem OMA-Discord-Server bei</p>
                <DiscordJoinButton href={inviteUrl} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-teal-950 bg-teal-400 hover:bg-teal-300 transition-colors" />
              </div>
            </li>
          )}
          <li className="flex items-start gap-3">
            <span className="mt-2 w-5 h-5 shrink-0 rounded-full bg-[#5865F2]/15 border border-[#5865F2]/30 text-[11px] font-bold text-indigo-300 flex items-center justify-center">{inviteUrl ? "2" : "1"}</span>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1.5">{inviteUrl ? "Danach hier mit Discord anmelden" : "Melde dich mit Discord an"}</p>
              <DiscordLoginButton
                callbackUrl={callbackUrl}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[#5865F2] hover:bg-[#4752c4] transition-colors disabled:opacity-60"
              />
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

/**
 * Dauerhafter Hinweis für Gäste. Klebt unterhalb der fixierten Navigation, damit
 * er beim Scrollen sichtbar bleibt (Offsets entsprechen dem `pt` von <main> in
 * DashboardChrome).
 */
export function GuestBanner() {
  const { isGuest, inviteUrl, openGate } = useGuestGate();
  if (!isGuest) return null;

  return (
    <div
      className="sticky z-30 mx-3 sm:mx-6 top-[5.75rem] lg:top-[100px] mb-3 lg:mb-4 rounded-xl backdrop-blur-xl"
      style={{ background: "rgba(6,20,18,0.88)", border: "1px solid rgba(20,184,166,0.28)", boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3.5 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white leading-snug">Du siehst gerade nur die Vorschau</p>
          <p className="text-[11px] text-gray-400 leading-snug">
            Tritt dem Discord-Server bei und melde dich an, um Events, Quests, Shop &amp; mehr zu nutzen.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {inviteUrl && (
            <DiscordJoinButton
              href={inviteUrl}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-950 bg-teal-400 hover:bg-teal-300 transition-colors whitespace-nowrap"
            />
          )}
          <DiscordLoginButton
            callbackUrl="/dashboard"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#5865F2] hover:bg-[#4752c4] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            Anmelden
          </DiscordLoginButton>
          <button
            type="button"
            onClick={() => openGate({ title: "So kommst du rein", message: "Zwei kurze Schritte, dann steht dir alles offen:" })}
            className="hidden sm:inline text-[11px] text-gray-500 hover:text-teal-300 underline underline-offset-2 transition-colors whitespace-nowrap"
          >
            Wie geht das?
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Drop-in-Ersatz für `next/link`: Für Gäste öffnet ein Klick auf eine gesperrte
 * Seite das Beitritts-/Login-Modal statt eines harten Redirects auf /login.
 */
export function GateLink({ href, onClick, children, ...rest }: ComponentProps<typeof Link>) {
  const { isGuest, openGate } = useGuestGate();
  const target = typeof href === "string" ? href : href.pathname ?? "";

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (isGuest && !isGuestAllowedPath(target)) {
      e.preventDefault();
      openGate({ href: target });
    }
  }

  return <Link href={href} onClick={handleClick} {...rest}>{children}</Link>;
}

/** Button-Variante für gesperrte Aktionen (z. B. Event-Anmeldung). */
export function GateButton({
  href, title, message, className, children,
}: GateOptions & { className?: string; children: ReactNode }) {
  const { openGate } = useGuestGate();
  return (
    <button type="button" className={className} onClick={() => openGate({ href, title, message })}>
      {children}
    </button>
  );
}

/** Fade-out + Hinweis unter einer für Gäste gekürzten Liste ("Alle Einträge nach Login"). */
export function GuestMoreCta({ message, className = "" }: { message: string; className?: string }) {
  const { isGuest, openGate } = useGuestGate();
  if (!isGuest) return null;
  return (
    <div className={`relative -mt-16 pt-16 text-center ${className}`}
      style={{ background: "linear-gradient(to bottom, transparent 0%, var(--bg-base, #0b0d12) 60%)" }}>
      <div className="inline-flex flex-col items-center gap-2 px-5 py-4 rounded-2xl"
        style={{ background: "rgba(6,20,18,0.85)", border: "1px solid rgba(20,184,166,0.25)" }}>
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Lock className="w-4 h-4 text-rose-400" /> {message}
        </div>
        <button
          type="button"
          onClick={() => openGate({ title: "So kommst du rein", message: "Zwei kurze Schritte, dann steht dir alles offen:" })}
          className="px-4 py-2 rounded-lg text-sm font-bold text-teal-950 bg-teal-400 hover:bg-teal-300 transition-colors"
        >
          Beitreten &amp; anmelden
        </button>
      </div>
    </div>
  );
}

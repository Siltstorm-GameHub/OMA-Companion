"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Plus, ShieldCheck } from "@/components/icons";
import { useGuestGate } from "@/components/GuestGate";
import { HUB_BADGE_EVENT, readHubBadge, toggleHub } from "@/lib/hub-events";
import { UserMenu } from "./UserMenu";
import { GlobalSearch } from "./GlobalSearch";

/**
 * Kopfzeile: am Handy mit Logo, am Desktop nur rechtsbündig (Logo steht in der Seitenleiste).
 * Suche · "Event erstellen" (Desktop) · Münzen · Glocke (öffnet den Community-Hub mit Benachrichtigungen
 * und Absprachen) · Avatar-Menü.
 * Höhe fest 3.5rem (Handy) bzw. 4.5rem (Desktop) — der Community-Hub dockt darunter an.
 */
export function TopBar() {
  const { data: session } = useSession();
  const { isGuest, openGate } = useGuestGate();
  const user = session?.user as { role?: string; points?: number } | undefined;
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-2 px-4 lg:h-[4.5rem] lg:px-7">
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label="OMA – zur Übersicht">
          <Image src="/brand/logo-64.png" alt="" width={32} height={32} className="rounded-control" />
          <span className="font-extrabold text-fg">OMA</span>
        </Link>

        {!isGuest && (
          <div className="hidden lg:block">
            <GlobalSearch />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isGuest ? (
            <button
              type="button"
              onClick={() => openGate({ title: "So kommst du rein", message: "Zwei kurze Schritte, dann steht dir alles offen:" })}
              className="flex min-h-10 items-center rounded-control bg-primary px-4 text-sm font-bold text-primary-ink hover:bg-primary-hover"
            >
              Anmelden
            </button>
          ) : (
            <>
              {/* Handy/Tablet: Lupe (das Feld klappt unter der Kopfzeile auf) */}
              <div className="lg:hidden"><GlobalSearch /></div>
              {/* Jedes Mitglied darf Community-Events anlegen (Limits: lib/community-event-limits.ts) */}
              <Link
                href="/events/verwalten/neu"
                className="hidden h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control bg-primary px-4 text-sm font-bold text-primary-ink hover:bg-primary-hover lg:flex"
              >
                <Plus className="size-4" aria-hidden /> Event erstellen
              </Link>
              {isStaff && (
                <Link
                  href="/admin"
                  className="grid size-10 place-items-center rounded-control border border-line bg-surface text-danger hover:border-line-strong lg:hidden"
                  aria-label="Admin-Bereich"
                >
                  <ShieldCheck className="size-[1.125rem]" aria-hidden />
                </Link>
              )}
              <Link
                href="/points"
                className="flex h-10 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-sm font-bold text-coin hover:border-line-strong lg:h-11"
                aria-label={`${(user?.points ?? 0).toLocaleString("de-DE")} Münzen – Verlauf ansehen`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- kleines statisches Icon */}
                <img src="/Muenze Icon.png" alt="" width={16} height={16} className="size-4 object-contain" />
                {(user?.points ?? 0).toLocaleString("de-DE")}
              </Link>
              <BellButton />
              <UserMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function BellButton() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Startwert, falls der Hub schon gemeldet hat
    setCount(readHubBadge());
    const onBadge = (e: Event) => setCount((e as CustomEvent<number>).detail);
    window.addEventListener(HUB_BADGE_EVENT, onBadge);
    return () => window.removeEventListener(HUB_BADGE_EVENT, onBadge);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleHub}
      className="relative grid size-10 place-items-center rounded-control border border-line bg-surface text-fg hover:border-line-strong lg:size-11"
      aria-label={count ? `Benachrichtigungen, ${count} ungelesen` : "Benachrichtigungen"}
    >
      <Bell className="size-[1.125rem]" aria-hidden />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-live px-1 text-[0.6875rem] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Heart } from "@/components/icons";
import { GateLink } from "@/components/GuestGate";
import PollBadge from "@/components/PollBadge";
import AdminNav from "@/app/(app)/(dashboard)/admin/AdminNav";
import { HUB_ONLINE_EVENT, readHubOnline, toggleHub } from "@/lib/hub-events";
import { cn } from "@/lib/utils";
import { COMMUNITY_NAV, MAIN_NAV, isActive, type NavItem } from "./nav-config";
import { LiveNow } from "./LiveNow";

/** Spendenpool-Fortschritt für die Support-Karte (berechnet im Dashboard-Layout). */
export type SupportProgress = { label: string; percent: number };

/**
 * Seitenleiste am Desktop (ab lg): Menü · Community · Gerade live · Support-Karte.
 * Im Admin-Bereich steht hier stattdessen die Admin-Navigation mit "Zurück zur App".
 */
export function Sidebar({ support }: { support: SupportProgress | null }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "user";
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-sidebar px-3.5 py-5 lg:flex">
      <div className="space-y-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2" aria-label="OMA – zur Übersicht">
          <Image src="/brand/logo-64.png" alt="" width={36} height={36} className="rounded-control" />
          <span className="text-lg font-extrabold tracking-wide text-fg">OLD MASTERS</span>
        </Link>
        {!inAdmin && <OnlineCount />}
      </div>

      {inAdmin ? (
        <>
          <Link
            href="/dashboard"
            className="flex min-h-10 items-center gap-2 rounded-control border border-line px-2.5 text-sm font-semibold text-muted hover:border-line-strong hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden /> Zurück zur App
          </Link>
          <AdminNav role={role} placement="sidebar" />
        </>
      ) : (
        <>
          <NavSection title="Menü" items={MAIN_NAV} pathname={pathname} label="Hauptnavigation" />
          <NavSection title="Community" items={COMMUNITY_NAV} pathname={pathname} label="Community" />
          <LiveNow />
          <SupportCard active={pathname.startsWith("/donations")} support={support} />
        </>
      )}
    </aside>
  );
}

function NavSection(props: { title: string; items: NavItem[]; pathname: string; label: string }) {
  return (
    <nav aria-label={props.label} className="flex flex-col gap-0.5">
      <p className="mb-1.5 px-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-subtle">{props.title}</p>
      {props.items.map((item) => {
        const active = isActive(props.pathname, item);
        return (
          <GateLink
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-control px-2.5 text-[0.9375rem] transition-colors",
              active ? "bg-primary-soft font-semibold text-primary-fg" : "text-gray-300 hover:bg-surface-2 hover:text-fg",
            )}
          >
            <span className="relative inline-flex">
              <item.icon className="size-[1.125rem]" aria-hidden />
              {item.pollBadge && <PollBadge />}
            </span>
            {item.label}
          </GateLink>
        );
      })}
    </nav>
  );
}

/** "12 online" — Zahl kommt vom Community-Hub (Presence), ein Klick öffnet dessen Panel. */
function OnlineCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Startwert, falls der Hub schon gemeldet hat
    setCount(readHubOnline());
    const on = (e: Event) => setCount((e as CustomEvent<number>).detail);
    window.addEventListener(HUB_ONLINE_EVENT, on);
    return () => window.removeEventListener(HUB_ONLINE_EVENT, on);
  }, []);
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={toggleHub}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg max-lg:min-h-10"
    >
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      {count} online
    </button>
  );
}

/** Support ist kein eigener Menüpunkt mehr, sondern eine Karte unten in der Seitenleiste. */
function SupportCard({ active, support }: { active: boolean; support: SupportProgress | null }) {
  return (
    <div className="mt-auto rounded-card border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-sm font-extrabold text-fg">
        <Heart className="size-4 text-live" aria-hidden /> OMA unterstützen
      </p>
      {support ? (
        <div className="mt-2.5">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-muted">{support.label}</span>
            <span className="shrink-0 font-bold tabular-nums text-fg">{support.percent} %</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={support.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Spendenpool: ${support.label} zu ${support.percent} % gedeckt`}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${support.percent}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-muted">Server, Preise und Events laufen über den Spendenpool.</p>
      )}
      <GateLink
        href="/donations"
        aria-current={active ? "page" : undefined}
        className="mt-3 flex min-h-10 items-center justify-center rounded-control bg-primary px-3 text-sm font-bold text-primary-ink hover:bg-primary-hover"
      >
        Zum Spendenpool
      </GateLink>
    </div>
  );
}

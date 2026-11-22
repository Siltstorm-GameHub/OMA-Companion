"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "@/components/icons";
import { GateLink } from "@/components/GuestGate";
import PollBadge from "@/components/PollBadge";
import { cn } from "@/lib/utils";
import { COMMUNITY_NAV, MAIN_NAV, isActive, type NavItem } from "./nav-config";
import { LiveNow } from "./LiveNow";

/** Seitenleiste am Desktop (ab lg): Menü · Community · Gerade live · Support-Karte. */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-sidebar px-3.5 py-5 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2" aria-label="OMA – zur Übersicht">
        <Image src="/brand/logo-64.png" alt="" width={36} height={36} className="rounded-control" />
        <span className="text-lg font-extrabold tracking-wide text-fg">OLD MASTERS</span>
      </Link>

      <NavSection title="Menü" items={MAIN_NAV} pathname={pathname} label="Hauptnavigation" />
      <NavSection title="Community" items={COMMUNITY_NAV} pathname={pathname} label="Community" />
      <LiveNow />

      <SupportCard active={pathname.startsWith("/donations")} />
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

/** Support ist kein eigener Menüpunkt mehr, sondern eine Karte unten in der Seitenleiste. */
function SupportCard({ active }: { active: boolean }) {
  return (
    <div className="mt-auto rounded-card border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-sm font-extrabold text-fg">
        <Heart className="size-4 text-live" aria-hidden /> OMA unterstützen
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">Server, Preise und Events laufen über den Spendenpool.</p>
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

"use client";

import { usePathname } from "next/navigation";
import { GateLink } from "@/components/GuestGate";
import PollBadge from "@/components/PollBadge";
import { cn } from "@/lib/utils";
import { MOBILE_NAV, isActive } from "./nav-config";

/** Untere Leiste am Handy (bis lg): Übersicht · Events · Games · Community · Ich. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-sidebar px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <GateLink
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold",
              active ? "text-primary-fg" : "text-subtle",
            )}
          >
            <span className={cn("relative rounded-full px-3.5 py-0.5", active && "bg-primary-soft")}>
              <item.icon className="size-5" aria-hidden />
              {item.pollBadge && <PollBadge />}
            </span>
            {item.label}
          </GateLink>
        );
      })}
    </nav>
  );
}

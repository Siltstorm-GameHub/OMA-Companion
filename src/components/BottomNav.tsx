"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Trophy, Scroll, User } from "lucide-react";

const NAV = [
  { label: "Home",      href: "/dashboard",  icon: LayoutDashboard },
  { label: "Quests",    href: "/quests",      icon: Scroll },
  { label: "Events",    href: "/events",      icon: CalendarDays },
  { label: "Rangliste", href: "/leaderboard", icon: Trophy },
  { label: "Profil",    href: "/profile",     icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{ background: "rgba(9,9,15,0.88)" }}
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden backdrop-blur-2xl border-t border-white/[0.06] safe-area-pb"
    >
      <div className="flex items-stretch h-16">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors"
            >
              {/* Active pill indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-rose-400 shadow-[0_2px_8px_rgba(244,63,94,0.5)]" />
              )}

              <div className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                active
                  ? "bg-rose-500/10 text-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.15)]"
                  : "text-gray-600"
              }`}>
                <Icon
                  className="w-5 h-5 transition-all"
                  style={{ transform: active ? "scale(1.1)" : "scale(1)" }}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              <span className={`text-[9px] font-medium tracking-wide leading-none ${
                active ? "text-rose-400" : "text-gray-600"
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

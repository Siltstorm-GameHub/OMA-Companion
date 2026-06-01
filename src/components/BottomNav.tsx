"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Trophy, Scroll, User } from "lucide-react";

const NAV = [
  { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
  { label: "Quests",     href: "/quests",      icon: Scroll },
  { label: "Events",     href: "/events",      icon: CalendarDays },
  { label: "Rangliste",  href: "/leaderboard", icon: Trophy },
  { label: "Profil",     href: "/profile",     icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-gray-950/95 backdrop-blur-md border-t border-white/5 safe-area-pb">
      <div className="flex items-stretch h-16">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? "text-rose-400" : "text-gray-600 active:text-gray-300"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${active ? "text-rose-400" : "text-gray-600"}`}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-rose-500 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

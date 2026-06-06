"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, ShoppingBag, Trophy, User } from "lucide-react";

const NAV = [
  { label: "Home",      href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",    href: "/events",      icon: CalendarDays },
  { label: "Shop",      href: "/shop",        icon: ShoppingBag },
  { label: "Rangliste", href: "/leaderboard", icon: Trophy },
  { label: "Profil",    href: "/profile",     icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{ background: "rgba(4,10,9,0.97)", borderTop: "1px solid rgba(20,184,166,0.09)" }}
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden backdrop-blur-2xl safe-area-pb"
    >
      <div className="flex items-stretch h-16">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center relative"
            >
              {/* Teal top indicator */}
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
                  style={{
                    background: "#14b8a6",
                    boxShadow: "0 0 10px rgba(20,184,166,0.9), 0 2px 16px rgba(20,184,166,0.5)",
                  }}
                />
              )}

              {/* Icon chip */}
              <div
                className="flex items-center justify-center rounded-xl transition-all duration-200"
                style={{
                  width: active ? 44 : 36,
                  height: active ? 32 : 32,
                  background: active ? "rgba(20,184,166,0.12)" : "transparent",
                  boxShadow: active ? "0 0 16px rgba(20,184,166,0.18)" : "none",
                  border: active ? "1px solid rgba(20,184,166,0.20)" : "1px solid transparent",
                }}
              >
                <Icon
                  style={{
                    width: 20,
                    height: 20,
                    color: active ? "#2dd4bf" : "#4b5563",
                    filter: active ? "drop-shadow(0 0 5px rgba(20,184,166,0.8))" : "none",
                    strokeWidth: active ? 2.5 : 2,
                    transition: "all 200ms",
                  }}
                />
              </div>

              {/* Label — only visible when active */}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  marginTop: 3,
                  lineHeight: 1,
                  color: active ? "#2dd4bf" : "transparent",
                  transition: "color 200ms",
                  userSelect: "none",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

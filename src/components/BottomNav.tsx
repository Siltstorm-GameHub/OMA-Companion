"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, ShoppingBag, Trophy, User, Swords, Heart } from "lucide-react";
import PollBadge from "@/components/PollBadge";

const NAV = [
  { label: "Home",    href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",  href: "/events",      icon: CalendarDays },
  { label: "Shop",    href: "/shop",        icon: ShoppingBag },
  { label: "LuL",     href: "/lul",         icon: Swords },
  { label: "Spenden", href: "/donations",   icon: Heart },
  { label: "Rang",    href: "/leaderboard", icon: Trophy },
  { label: "Profil",  href: "/profile",     icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(13,13,15,0.97)",
        borderTop: "1px solid rgba(20,184,166,0.10)",
      }}
      className="backdrop-blur-2xl safe-area-pb"
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
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-b-full"
                  style={{
                    background: "#14b8a6",
                    boxShadow: "0 0 10px rgba(20,184,166,0.9), 0 2px 16px rgba(20,184,166,0.5)",
                  }}
                />
              )}

              {/* Icon chip */}
              <div
                className="flex items-center justify-center rounded-sm transition-all duration-200 relative"
                style={{
                  width: active ? 36 : 28,
                  height: 26,
                  background: active ? "rgba(20,184,166,0.12)" : "transparent",
                  boxShadow: active ? "0 0 16px rgba(20,184,166,0.15)" : "none",
                  border: active ? "1px solid rgba(20,184,166,0.20)" : "1px solid transparent",
                }}
              >
                <Icon
                  style={{
                    width: 17,
                    height: 17,
                    color: active ? "#2dd4bf" : "#4b5563",
                    filter: active ? "drop-shadow(0 0 5px rgba(20,184,166,0.75))" : "none",
                    strokeWidth: active ? 2.5 : 2,
                    transition: "all 200ms",
                  }}
                />
                {href === "/events" && <PollBadge />}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  marginTop: 3,
                  lineHeight: 1,
                  color: active ? "#2dd4bf" : "rgba(107,114,128,0.85)",
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

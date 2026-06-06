"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Trophy, User,
  ShieldCheck, Scroll, Star, ShoppingBag, LogOut,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",          href: "/events",      icon: CalendarDays },
  { label: "Shop",            href: "/shop",        icon: ShoppingBag },
  { label: "Level-Up-League", href: "/lul",         icon: Star },
  { label: "Quests",          href: "/quests",      icon: Scroll },
  { label: "Rangliste",       href: "/leaderboard", icon: Trophy },
  { label: "Mein Profil",     href: "/profile",     icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!isDesktop) return null;

  const role    = session?.user?.role ?? "user";
  const isStaff = role === "admin" || role === "moderator";

  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl"
      style={{
        background: "rgba(4,10,9,0.88)",
        border: "1px solid rgba(20,184,166,0.12)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(20,184,166,0.06)",
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="mb-1 group relative">
        <div
          className="w-8 h-8 rounded-xl overflow-hidden"
          style={{ boxShadow: "0 0 14px rgba(20,184,166,0.35)", outline: "1px solid rgba(20,184,166,0.25)" }}
        >
          <Image src="/OMALogoNew.png" alt="OMA" width={32} height={32} className="w-full h-full object-cover" />
        </div>
        <Tooltip label="OMA Home" />
      </Link>

      {/* Divider */}
      <div className="w-6 h-px my-1" style={{ background: "rgba(20,184,166,0.12)" }} />

      {/* Nav icons */}
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="group relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
            style={active ? {
              background: "rgba(20,184,166,0.14)",
              boxShadow: "0 0 14px rgba(20,184,166,0.20), inset 0 0 0 1px rgba(20,184,166,0.22)",
            } : undefined}
          >
            <Icon
              style={{
                width: 18,
                height: 18,
                strokeWidth: active ? 2.5 : 2,
                color: active ? "#2dd4bf" : "#4b5563",
                filter: active ? "drop-shadow(0 0 5px rgba(20,184,166,0.8))" : "none",
                transition: "all 150ms",
              }}
            />
            {/* Active dot */}
            {active && (
              <span
                className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full"
                style={{ background: "#14b8a6", boxShadow: "0 0 8px rgba(20,184,166,0.9)" }}
              />
            )}
            <Tooltip label={label} />
          </Link>
        );
      })}

      {/* Admin */}
      {isStaff && (
        <>
          <div className="w-6 h-px my-1" style={{ background: "rgba(20,184,166,0.08)" }} />
          <Link
            href="/admin"
            className="group relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
            style={pathname.startsWith("/admin") ? {
              background: "rgba(153,27,27,0.14)",
              boxShadow: "0 0 14px rgba(153,27,27,0.20), inset 0 0 0 1px rgba(153,27,27,0.22)",
            } : undefined}
          >
            <ShieldCheck
              style={{
                width: 18,
                height: 18,
                strokeWidth: pathname.startsWith("/admin") ? 2.5 : 2,
                color: pathname.startsWith("/admin") ? "#f87171" : "#4b5563",
                filter: pathname.startsWith("/admin") ? "drop-shadow(0 0 5px rgba(185,28,28,0.8))" : "none",
                transition: "all 150ms",
              }}
            />
            <Tooltip label="Admin" />
          </Link>
        </>
      )}

      {/* Divider */}
      <div className="w-6 h-px my-1" style={{ background: "rgba(20,184,166,0.08)" }} />

      {/* Avatar / Sign-out */}
      <div className="group relative flex items-center justify-center">
        {session?.user?.image ? (
          <Image
            src={session.user.image}
            alt="avatar"
            width={32}
            height={32}
            className="w-8 h-8 rounded-full cursor-pointer"
            style={{ outline: "1px solid rgba(20,184,166,0.22)" }}
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer"
            style={{ background: "linear-gradient(135deg, #0d9488, #115e59)", outline: "1px solid rgba(20,184,166,0.3)" }}
          >
            {session?.user?.name?.[0] ?? "?"}
          </div>
        )}
        {/* Hover menu: sign out */}
        <div
          className="pointer-events-none group-hover:pointer-events-auto absolute left-full ml-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ minWidth: 140 }}
        >
          <div
            className="px-3 py-2 rounded-xl text-xs text-gray-400"
            style={{ background: "#0a1512", border: "1px solid rgba(20,184,166,0.12)" }}
          >
            {session?.user?.name ?? "Gast"}
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-teal-400 transition-colors"
            style={{ background: "#0a1512", border: "1px solid rgba(20,184,166,0.12)" }}
          >
            <LogOut style={{ width: 13, height: 13 }} />
            Abmelden
          </button>
        </div>
      </div>
    </div>
  );
}

function Tooltip({ label }: { label: string }) {
  return (
    <span
      className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
      style={{
        background: "#0a1512",
        border: "1px solid rgba(20,184,166,0.15)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      {label}
    </span>
  );
}

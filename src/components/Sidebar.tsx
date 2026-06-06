"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Trophy, User,
  ShieldCheck, Star, ShoppingBag, LogOut, X,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",          href: "/events",      icon: CalendarDays },
  { label: "Shop",            href: "/shop",        icon: ShoppingBag },
  { label: "Level-Up-League", href: "/lul",         icon: Star },
  { label: "Rangliste",       href: "/leaderboard", icon: Trophy },
  { label: "Mein Profil",     href: "/profile",     icon: User },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close mobile bar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close on outside tap
  useEffect(() => {
    if (!mobileOpen) return;
    function onPointer(e: PointerEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [mobileOpen]);

  const role    = session?.user?.role ?? "user";
  const isStaff = role === "admin" || role === "moderator";

  // ── Desktop: always-visible floating pill ──────────────────────
  if (isDesktop) {
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

        <Divider />

        {NAV.map(({ label, href, icon: Icon }) => (
          <NavIcon key={href} label={label} href={href} icon={Icon} active={pathname === href || pathname.startsWith(href + "/")} />
        ))}

        {isStaff && (
          <>
            <Divider />
            <NavIcon label="Admin" href="/admin" icon={ShieldCheck} active={pathname.startsWith("/admin")} danger />
          </>
        )}

        <Divider />
        <AvatarMenu session={session} />
      </div>
    );
  }

  // ── Mobile: FAB trigger + expandable overlay ───────────────────
  return (
    <>
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[44] bg-black/50"
          style={{ backdropFilter: "blur(2px)" }}
        />
      )}

      <div ref={barRef} className="fixed left-4 top-1/2 -translate-y-1/2 z-[45] flex flex-col items-center gap-1">
        {/* Expanded bar */}
        <div
          className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl overflow-hidden"
          style={{
            background: "rgba(4,10,9,0.95)",
            border: "1px solid rgba(20,184,166,0.14)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(20,184,166,0.07)",
            maxHeight: mobileOpen ? 600 : 48,
            transition: "max-height 320ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Toggle button (always visible) */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 shrink-0"
            style={mobileOpen ? {
              background: "rgba(20,184,166,0.14)",
              boxShadow: "0 0 14px rgba(20,184,166,0.20), inset 0 0 0 1px rgba(20,184,166,0.22)",
            } : undefined}
            aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
          >
            {mobileOpen ? (
              <X style={{ width: 16, height: 16, color: "#2dd4bf" }} />
            ) : (
              <div className="w-8 h-8 rounded-xl overflow-hidden" style={{ outline: "1px solid rgba(20,184,166,0.25)" }}>
                <Image src="/OMALogoNew.png" alt="OMA" width={32} height={32} className="w-full h-full object-cover" />
              </div>
            )}
          </button>

          {/* Nav items — only visible when open */}
          {mobileOpen && (
            <>
              <Divider />
              {NAV.map(({ label, href, icon: Icon }) => (
                <NavIconMobile key={href} label={label} href={href} icon={Icon} active={pathname === href || pathname.startsWith(href + "/")} />
              ))}
              {isStaff && (
                <>
                  <Divider />
                  <NavIconMobile label="Admin" href="/admin" icon={ShieldCheck} active={pathname.startsWith("/admin")} danger />
                </>
              )}
              <Divider />
              <AvatarMenu session={session} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function Divider() {
  return <div className="w-6 h-px my-0.5" style={{ background: "rgba(20,184,166,0.10)" }} />;
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

function NavIcon({
  label, href, icon: Icon, active, danger,
}: {
  label: string; href: string; icon: React.ElementType; active: boolean; danger?: boolean;
}) {
  const color = danger
    ? active ? "#f87171" : "#4b5563"
    : active ? "#2dd4bf" : "#4b5563";
  const bg = danger
    ? "rgba(153,27,27,0.14)"
    : "rgba(20,184,166,0.14)";
  const shadow = danger
    ? "0 0 14px rgba(153,27,27,0.20), inset 0 0 0 1px rgba(153,27,27,0.22)"
    : "0 0 14px rgba(20,184,166,0.20), inset 0 0 0 1px rgba(20,184,166,0.22)";
  const dot = danger ? "#b91c1c" : "#14b8a6";

  return (
    <Link
      href={href}
      className="group relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
      style={active ? { background: bg, boxShadow: shadow } : undefined}
    >
      <Icon style={{ width: 18, height: 18, strokeWidth: active ? 2.5 : 2, color, filter: active ? `drop-shadow(0 0 5px ${color})` : "none", transition: "all 150ms" }} />
      {active && (
        <span className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} />
      )}
      <Tooltip label={label} />
    </Link>
  );
}

function NavIconMobile({
  label, href, icon: Icon, active, danger,
}: {
  label: string; href: string; icon: React.ElementType; active: boolean; danger?: boolean;
}) {
  const color = danger
    ? active ? "#f87171" : "#4b5563"
    : active ? "#2dd4bf" : "#4b5563";
  const bg = danger ? "rgba(153,27,27,0.14)" : "rgba(20,184,166,0.14)";
  const shadow = danger
    ? "0 0 14px rgba(153,27,27,0.20), inset 0 0 0 1px rgba(153,27,27,0.22)"
    : "0 0 14px rgba(20,184,166,0.20), inset 0 0 0 1px rgba(20,184,166,0.22)";

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 w-full pl-1 pr-3 py-1.5 rounded-xl transition-all duration-150"
      style={active ? { background: bg, boxShadow: shadow } : undefined}
    >
      <div className="flex items-center justify-center w-8 h-8 shrink-0">
        <Icon style={{ width: 18, height: 18, strokeWidth: active ? 2.5 : 2, color, filter: active ? `drop-shadow(0 0 5px ${color})` : "none" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? color : "#6b7280", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </Link>
  );
}

function AvatarMenu({ session }: { session: ReturnType<typeof useSession>["data"] }) {
  const [showSignOut, setShowSignOut] = useState(false);

  return (
    <div className="relative group flex items-center justify-center">
      <button
        onClick={() => setShowSignOut(v => !v)}
        className="flex items-center justify-center"
      >
        {session?.user?.image ? (
          <Image
            src={session.user.image}
            alt="avatar"
            width={32}
            height={32}
            className="w-8 h-8 rounded-full"
            style={{ outline: "1px solid rgba(20,184,166,0.22)" }}
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #0d9488, #115e59)", outline: "1px solid rgba(20,184,166,0.3)" }}
          >
            {session?.user?.name?.[0] ?? "?"}
          </div>
        )}
      </button>
      {/* Desktop tooltip / Mobile click popup */}
      <div
        className="pointer-events-none group-hover:pointer-events-auto absolute left-full ml-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 lg:flex hidden"
        style={{ minWidth: 140 }}
      >
        <div className="px-3 py-2 rounded-xl text-xs text-gray-400" style={{ background: "#0a1512", border: "1px solid rgba(20,184,166,0.12)" }}>
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
      {/* Mobile sign-out below avatar */}
      {showSignOut && (
        <div className="absolute left-full ml-3 flex flex-col gap-1 lg:hidden z-10" style={{ minWidth: 140 }}>
          <div className="px-3 py-2 rounded-xl text-xs text-gray-400" style={{ background: "#0a1512", border: "1px solid rgba(20,184,166,0.12)" }}>
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
      )}
    </div>
  );
}

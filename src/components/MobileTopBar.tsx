"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/events":     "Events",
  "/shop":       "Shop",
  "/tournament": "Turnier-Details",
  "/lul":        "Level-Up-League",
  "/leaderboard":"Rangliste",
  "/donations":  "Spendenpool",
  "/profile":    "Mein Profil",
  "/points":     "Punktesystem",
  "/admin":      "Admin",
};

export default function MobileTopBar() {
  const pathname          = usePathname();
  const { data: session } = useSession();
  const [open, setOpen]   = useState(false);
  const menuRef           = useRef<HTMLDivElement>(null);

  const title = Object.entries(ROUTE_TITLES)
    .find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? "OMA";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header
      style={{ background: "rgba(4,10,9,0.95)", borderBottom: "1px solid rgba(20,184,166,0.09)", top: "2.25rem" }}
      className="fixed left-0 right-0 z-40 lg:hidden h-14 backdrop-blur-2xl flex items-center px-4 gap-3"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

      {/* Seitentitel */}
      <Link href="/dashboard" className="flex items-center min-w-0 flex-1">
        <span className="text-sm font-semibold text-white truncate">{title}</span>
      </Link>

      {/* Avatar → Logout dropdown */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all"
          style={open ? { outline: "2px solid rgba(20,184,166,0.5)", outlineOffset: 2 } : { outline: "1px solid rgba(20,184,166,0.22)", outlineOffset: 1 }}
          aria-label="Profil-Menü"
        >
          {session?.user?.image ? (
            <Image src={session.user.image} alt="avatar" width={32} height={32} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #115e59)" }}>
              {session?.user?.name?.[0] ?? "?"}
            </div>
          )}
        </button>

        {/* Dropdown */}
        <div
          className="absolute top-full mt-2 right-0 rounded-xl overflow-hidden"
          style={{
            background: "rgba(4,10,9,0.97)",
            border: "1px solid rgba(20,184,166,0.14)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            minWidth: 160,
            transformOrigin: "top right",
            transform: open ? "scale(1) translateY(0)" : "scale(0.9) translateY(-6px)",
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transition: "transform 200ms cubic-bezier(0.16,1,0.3,1), opacity 150ms ease",
          }}
        >
          <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
            <p className="text-xs font-semibold text-white">{session?.user?.name ?? "Gast"}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(20,184,166,0.7)" }}>
              {(session?.user as { points?: number })?.points?.toLocaleString("de-DE") ?? 0} Münzen
            </p>
          </div>
          <div className="p-1">
            <Link href="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-teal-400 hover:bg-teal-500/8 transition-colors">
              <User style={{ width: 13, height: 13 }} />
              Mein Profil
            </Link>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/8 transition-colors w-full"
            >
              <LogOut style={{ width: 13, height: 13 }} />
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

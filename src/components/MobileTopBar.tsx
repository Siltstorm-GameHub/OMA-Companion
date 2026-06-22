"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import PwaInstallButton from "@/components/PwaInstallButton";
import { ThemeToggleItem } from "@/components/ThemeToggle";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);
  const btnRef            = useRef<HTMLButtonElement>(null);
  const dropRef           = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Schließen bei Außenklick
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [open]);

  // Schließen bei Seitenwechsel
  useEffect(() => { setOpen(false); }, [pathname]);

  const title = Object.entries(ROUTE_TITLES)
    .find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? "OMA";

  // Dropdown als fixed-Portal → komplett außerhalb des Header-Stacking-Contexts
  const dropdown = mounted && open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: "fixed",
        top: "calc(2.25rem + 3.5rem + 0.5rem)", // header-top + header-height + gap
        right: "1rem",
        zIndex: 9999,
        background: "rgba(4,10,9,0.97)",
        border: "1px solid rgba(20,184,166,0.14)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        borderRadius: "0.75rem",
        minWidth: 180,
        overflow: "hidden",
      }}
    >
      <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
        <p className="text-xs font-semibold text-white">{session?.user?.name ?? "Gast"}</p>
        <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "rgba(20,184,166,0.7)" }}>
          <img src="/Muenze Icon.png" alt="" width={11} height={11} style={{ objectFit: "contain" }} />
          {(session?.user as { points?: number })?.points?.toLocaleString("de-DE") ?? 0} Münzen
        </p>
      </div>
      <div className="p-1">
        <PwaInstallButton />
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-teal-400 hover:bg-teal-500/8 transition-colors"
        >
          <User style={{ width: 13, height: 13 }} />
          Mein Profil
        </Link>
        <ThemeToggleItem
          iconSize={13}
          fontSize={12}
          className="text-gray-400 hover:text-amber-400 hover:bg-white/[0.04] transition-colors"
        />
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/8 transition-colors w-full"
        >
          <LogOut style={{ width: 13, height: 13 }} />
          Abmelden
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <header
        style={{ background: "rgba(4,10,9,0.95)", borderBottom: "1px solid rgba(20,184,166,0.09)", top: "2.25rem" }}
        className="fixed left-0 right-0 z-50 lg:hidden h-14 backdrop-blur-2xl flex items-center px-4 gap-3"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

        <Link href="/dashboard" className="flex items-center min-w-0 flex-1" style={{ pointerEvents: "auto" }}>
          <span className="text-sm font-semibold text-white truncate">{title}</span>
        </Link>

        <button
          ref={btnRef}
          onPointerDown={(e) => { e.stopPropagation(); setOpen(v => !v); }}
          className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all shrink-0"
          style={open
            ? { outline: "2px solid rgba(20,184,166,0.5)", outlineOffset: 2, touchAction: "manipulation", position: "relative", zIndex: 200 }
            : { outline: "1px solid rgba(20,184,166,0.22)", outlineOffset: 1, touchAction: "manipulation", position: "relative", zIndex: 200 }}
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
      </header>

      {dropdown}
    </>
  );
}

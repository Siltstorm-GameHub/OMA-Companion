"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Sun, Moon, ShieldAlert } from "lucide-react";
import PwaInstallButton from "@/components/PwaInstallButton";
import RankedAvatar from "@/components/RankedAvatar";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/events":     "Events",
  "/shop":       "Shop",
  "/tournament": "Turnier-Details",
  "/leaderboard":"Rangliste",
  "/donations":  "Spendenpool",
  "/profile":    "Mein Profil",
  "/points":     "Punktesystem",
  "/admin":      "Admin",
};

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      setTheme(next);
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
    };
    if (typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === "function") {
      (document as Document & { startViewTransition: (fn: () => void) => void }).startViewTransition(apply);
    } else {
      apply();
    }
  }
  return { theme, toggle };
}

export default function MobileTopBar() {
  const pathname          = usePathname();
  const { data: session } = useSession();
  const myRankPoints      = (session?.user as { rankPoints?: number } | undefined)?.rankPoints ?? 0;
  const { theme, toggle } = useTheme();
  const [open, setOpen]   = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef            = useRef<HTMLButtonElement>(null);
  const dropRef           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const dropdown = mounted && open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: "fixed",
        top: "calc(var(--top-ticker, 2.25rem) + 3.5rem + 0.5rem)",
        right: "1rem",
        zIndex: 9999,
        background: "rgba(4,10,9,0.97)",
        border: "1px solid rgba(20,184,166,0.14)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        borderRadius: "0.75rem",
        width: 280,
        overflow: "hidden",
      }}
    >
      {/* Header: Avatar + Username + Theme + Abmelden */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
        <RankedAvatar
          rankPoints={myRankPoints}
          src={session?.user?.image}
          alt={session?.user?.name ?? "Gast"}
          size={28}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{session?.user?.name ?? "Gast"}</p>
          <p className="text-[10px] flex items-center gap-1" style={{ color: "rgba(20,184,166,0.7)" }}>
            <img src="/Muenze Icon.png" alt="" width={10} height={10} style={{ objectFit: "contain" }} />
            {(session?.user as { points?: number })?.points?.toLocaleString("de-DE") ?? 0}
          </p>
        </div>
        <button
          onClick={toggle}
          title={theme === "dark" ? "Light Mode" : "Dark Mode"}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/[0.04] transition-colors shrink-0"
        >
          {theme === "dark"
            ? <Sun style={{ width: 13, height: 13 }} />
            : <Moon style={{ width: 13, height: 13 }} />}
        </button>
        <button
          onClick={() => signOut()}
          title="Abmelden"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/8 transition-colors shrink-0"
        >
          <LogOut style={{ width: 13, height: 13 }} />
        </button>
      </div>

      {/* PWA Install (klein) */}
      <div className="px-1 pt-1 pb-1">
        <PwaInstallButton />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <header
        style={{ background: "rgba(4,10,9,0.95)", borderBottom: "1px solid rgba(20,184,166,0.09)", top: "var(--top-ticker, 2.25rem)" }}
        className="fixed left-0 right-0 z-50 lg:hidden h-14 backdrop-blur-2xl flex items-center px-4 gap-3"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

        <div className="flex-1 min-w-0 flex items-center">
          <Link href="/dashboard" className="flex items-center min-w-0">
            <span className="text-sm font-semibold text-white truncate">{title}</span>
          </Link>
        </div>

        {/* Admin-Button (nur Staff, nur Mobile) */}
        {(session?.user as { role?: string })?.role === "admin" || (session?.user as { role?: string })?.role === "moderator" ? (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)" }}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-semibold text-red-400">Admin</span>
          </Link>
        ) : null}

        {/* Avatar Button */}
        <button
          ref={btnRef}
          onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
          className="rounded-full overflow-visible flex items-center justify-center transition-all shrink-0 relative"
          style={{
            width: 44, height: 44,
            touchAction: "manipulation",
            zIndex: 200,
            marginRight: -6,
          }}
          aria-label="Profil-Menü"
        >
          {/* Die Teal-Outline signalisiert weiterhin "Menü offen" und sitzt per Offset
              außerhalb des Rang-Rings, damit sich beide nicht überlagern. */}
          <RankedAvatar
            rankPoints={myRankPoints}
            src={session?.user?.image}
            alt={session?.user?.name ?? "Gast"}
            size={32}
            className={open ? "outline-2 outline-teal-500/50 outline-offset-2" : "outline-1 outline-teal-500/[0.22] outline-offset-1"}
          />
        </button>
      </header>

      {dropdown}
    </>
  );
}

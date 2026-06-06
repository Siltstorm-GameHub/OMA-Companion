"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/events":     "Events",
  "/shop":       "Shop",
  "/auctions":   "Auktionen",
  "/tournament": "Turnier-Details",
  "/lul":        "Level-Up-League",
  "/leaderboard":"Rangliste",
  "/profile":    "Mein Profil",
  "/points":     "Punktesystem",
  "/admin":      "Admin",
};

export default function MobileTopBar() {
  const pathname = usePathname();

  const title = Object.entries(ROUTE_TITLES)
    .find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? "OMA";

  return (
    <header
      style={{ background: "rgba(4,10,9,0.95)", borderBottom: "1px solid rgba(20,184,166,0.09)" }}
      className="fixed top-0 left-0 right-0 z-40 lg:hidden h-14 backdrop-blur-2xl flex items-center px-4 gap-3"
    >
      {/* Subtile Teal-Linie oben */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

      <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-7 h-7 rounded-lg overflow-hidden shrink-0"
          style={{ boxShadow: "0 0 12px rgba(20,184,166,0.35)", outline: "1px solid rgba(20,184,166,0.25)" }}
        >
          <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-full h-full object-cover" />
        </div>
        <span className="text-sm font-semibold text-white truncate">{title}</span>
      </Link>
    </header>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, LayoutDashboard, Star, ShoppingBag, Bot,
  BarChart2, CalendarDays, Heart, Medal,
  Wrench, Users2, Megaphone, Handshake, Clapperboard, Server,
} from "lucide-react";
import ServerApplicationBadge from "@/components/ServerApplicationBadge";

type Role = "user" | "moderator" | "admin";
const HIERARCHY: Role[] = ["user", "moderator", "admin"];
function hasRole(userRole: string, minRole: Role) {
  return HIERARCHY.indexOf(userRole as Role) >= HIERARCHY.indexOf(minRole);
}

type Tab = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; minRole: Role };

const CATEGORIES: {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole: Role;
  direct?: string; // if set, clicking the category goes directly here (no sub-nav)
  tabs?: Tab[];
  prefixes?: string[]; // url prefixes that mark this category as active
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    minRole: "moderator",
    direct: "/admin",
    prefixes: ["/admin"],
  },
  {
    key: "events",
    label: "Events",
    icon: CalendarDays,
    minRole: "moderator",
    prefixes: ["/admin/events", "/admin/series", "/admin/lul", "/admin/clip-contest", "/admin/polls"],
    tabs: [
      { href: "/admin/events",       label: "Events",          icon: CalendarDays,  minRole: "moderator" },
      { href: "/admin/lul",          label: "Level-Up-League", icon: Star,          minRole: "moderator" },
      { href: "/admin/clip-contest", label: "Clip des Monats", icon: Clapperboard,  minRole: "moderator" },
      { href: "/admin/polls",        label: "Umfragen",        icon: BarChart2,     minRole: "admin"     },
    ],
  },
  {
    key: "community",
    label: "Community",
    icon: Users2,
    minRole: "moderator",
    prefixes: ["/admin/daily-message", "/admin/partners", "/admin/servers", "/admin/donations"],
    tabs: [
      { href: "/admin/daily-message", label: "Mitteilungen", icon: Megaphone, minRole: "admin"     },
      { href: "/admin/partners",      label: "Partner",      icon: Handshake, minRole: "moderator" },
      { href: "/admin/servers",       label: "Gameserver",   icon: Server,    minRole: "moderator" },
      { href: "/admin/donations",     label: "Spendenpool",  icon: Heart,     minRole: "moderator" },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    icon: Wrench,
    minRole: "admin",
    prefixes: ["/admin/shop", "/admin/bot", "/admin/badges", "/admin/users"],
    tabs: [
      { href: "/admin/shop",   label: "Shop",            icon: ShoppingBag, minRole: "admin" },
      { href: "/admin/bot",    label: "Bot",             icon: Bot,         minRole: "admin" },
      { href: "/admin/badges", label: "Abzeichen",       icon: Medal,       minRole: "admin" },
      { href: "/admin/users",  label: "Nutzer & Rollen", icon: Users,       minRole: "admin" },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? "user";

  const activeCategory = CATEGORIES.find(cat =>
    cat.prefixes?.some(p =>
      cat.key === "dashboard" ? pathname === p : pathname.startsWith(p)
    )
  ) ?? CATEGORIES[0];

  const visibleCategories = CATEGORIES.filter(cat => {
    if (!hasRole(userRole, cat.minRole)) return false;
    // Hide category if user has no access to any of its tabs
    if (cat.tabs) return cat.tabs.some(t => hasRole(userRole, t.minRole));
    return true;
  });

  const visibleSubTabs = activeCategory.tabs?.filter(t => hasRole(userRole, t.minRole)) ?? [];

  return (
    <div className="mb-4 sm:mb-6 space-y-1">
      {/* ── Kategorie-Leiste ── */}
      <div className="flex gap-1 bg-gray-900 border border-white/5 rounded-xl p-1 w-full overflow-x-auto scrollbar-none">
        {visibleCategories.map(cat => {
          const isActive = cat.key === activeCategory.key;
          const Icon = cat.icon;
          const href = cat.direct
            ?? cat.tabs?.find(t => hasRole(userRole, t.minRole))?.href
            ?? "/admin";
          return (
            <Link key={cat.key} href={href}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start ${
                isActive
                  ? "bg-purple-600/20 text-purple-300 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)]"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
              }`}>
              <span className="relative shrink-0">
                <Icon className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-gray-600"}`} />
                {cat.key === "community" && <ServerApplicationBadge />}
              </span>
              <span>{cat.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Sub-Navigation ── */}
      {visibleSubTabs.length > 0 && (
        <div className="flex gap-1 px-1">
          {visibleSubTabs.map(tab => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                  active
                    ? "text-white bg-white/8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                }`}>
                <span className="relative shrink-0">
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-purple-400" : "text-gray-600"}`} />
                  {tab.href === "/admin/servers" && <ServerApplicationBadge />}
                </span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

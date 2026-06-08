"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, LayoutDashboard, Star, ShoppingBag } from "lucide-react";

type Role = "user" | "moderator" | "admin";

const TABS: { href: string; label: string; icon: typeof LayoutDashboard; exact: boolean; minRole: Role }[] = [
  { href: "/admin",       label: "Übersicht",      icon: LayoutDashboard, exact: true,  minRole: "moderator" },
  { href: "/admin/lul",   label: "Level-Up-League", icon: Star,            exact: false, minRole: "moderator" },
  { href: "/admin/users", label: "Nutzer & Rollen", icon: Users,           exact: false, minRole: "admin"     },
  { href: "/admin/shop",  label: "Shop",            icon: ShoppingBag,     exact: false, minRole: "admin"     },
];

const HIERARCHY: Role[] = ["user", "moderator", "admin"];
function hasRole(userRole: string, minRole: Role) {
  return HIERARCHY.indexOf(userRole as Role) >= HIERARCHY.indexOf(minRole);
}

export default function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? "user";

  const visibleTabs = TABS.filter(t => hasRole(userRole, t.minRole));

  return (
    <div className="flex gap-1 mb-4 sm:mb-6 bg-gray-900 border border-white/5 rounded-xl p-1 w-full sm:w-fit max-w-full overflow-x-auto scrollbar-none">
      {visibleTabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start ${
              active
                ? "bg-purple-600/20 text-purple-300 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)]"
                : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
            }`}>
            <Icon className={`w-4 h-4 shrink-0 ${active ? "text-purple-400" : "text-gray-600"}`} />
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

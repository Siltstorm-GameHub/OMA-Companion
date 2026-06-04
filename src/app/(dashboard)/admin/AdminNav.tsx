"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, LayoutDashboard, Star } from "lucide-react";

const TABS = [
  { href: "/admin",        label: "Übersicht",       icon: LayoutDashboard, exact: true },
  { href: "/admin/events", label: "Events",           icon: CalendarDays,    exact: false },
  { href: "/admin/users",  label: "Nutzer & Rollen",  icon: Users,           exact: false },
  { href: "/admin/lul",    label: "Level-Up-League",  icon: Star,            exact: false },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 mb-6 bg-gray-900 border border-white/5 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
      {TABS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              active
                ? "bg-purple-600/20 text-purple-300 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)]"
                : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
            }`}>
            <Icon className={`w-4 h-4 ${active ? "text-purple-400" : "text-gray-600"}`} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

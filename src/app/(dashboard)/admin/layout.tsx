import { requireRole } from "@/lib/roles";
import Link from "next/link";
import { Users, CalendarDays, Settings } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("moderator");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
          <Settings className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Admin-Bereich</h1>
          <p className="text-xs text-gray-500">Verwaltung von Events, Turnieren und Nutzern</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {[
          { href: "/admin", label: "Übersicht", icon: Settings },
          { href: "/admin/events", label: "Events", icon: CalendarDays },
          { href: "/admin/users", label: "Nutzer & Rollen", icon: Users },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}

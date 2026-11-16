import { redirect } from "next/navigation";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { Shield } from "@/components/icons";
import AdminNav from "./AdminNav";

// Admin-Bereich: nur Mods und Admins. Die Event-Verwaltung (früher /admin/events) liegt unter
// Events → "Verwalten" (/events/verwalten) und ist dort für alle Mitglieder offen — wer kein Mod ist,
// landet beim Aufruf von /admin dort. Einzelne Seiten prüfen zusätzlich ihre Mindestrolle
// (z.B. Nutzer, Shop, Benachrichtigungen nur für Admins).
// Navigation: Seitenleiste nach Aufgaben gruppiert (AdminNav, Struktur in lib/admin-nav.ts).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?notice=login_required&callbackUrl=/admin");
  if (!hasMinRole(user.role, "moderator")) redirect("/events/verwalten");

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-4 sm:mb-5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-700 to-purple-950 flex items-center justify-center shadow-lg shadow-purple-900/40">
          <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <p className="text-lg font-bold text-white tracking-tight leading-tight">Admin-Bereich</p>
      </div>

      <div className="lg:flex lg:gap-6">
        <AdminNav role={user.role} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

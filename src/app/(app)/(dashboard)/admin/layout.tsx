import { redirect } from "next/navigation";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { Shield } from "@/components/icons";
import AdminNav from "./AdminNav";

// Admin-Bereich: nur Mods und Admins. Die Event-Verwaltung (früher /admin/events) liegt unter
// Events → "Verwalten" (/events/verwalten) und ist dort für alle Mitglieder offen — wer kein Mod ist,
// landet beim Aufruf von /admin dort. Einzelne Seiten prüfen zusätzlich ihre Mindestrolle
// (z.B. Nutzer, Shop, Benachrichtigungen nur für Admins).
// Navigation: am Desktop ersetzt die Admin-Liste die App-Navigation in der Seitenleiste
// (components/shell/Sidebar.tsx), am Handy/Tablet ein Menü-Knopf oben (AdminNav, Struktur in lib/admin-nav.ts).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?notice=login_required&callbackUrl=/admin");
  if (!hasMinRole(user.role, "moderator")) redirect("/events/verwalten");

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex items-center gap-3 mb-4 sm:mb-5">
        <div className="w-9 h-9 rounded-control bg-primary-soft flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary-fg" />
        </div>
        <p className="text-lg font-extrabold text-fg tracking-tight leading-tight">Admin-Bereich</p>
      </div>

      <AdminNav role={user.role} placement="page" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

import { requireModeratorOrAnySquadCaptain } from "@/lib/roles";
import { Shield } from "lucide-react";
import AdminNav from "./AdminNav";

// Der blanket Gate hier lässt zusätzlich zu Moderatoren/Admins auch reine Squad-Captains durch (globale
// Rolle bleibt "user") — jede einzelne Unterseite hat aber weiterhin ihre eigene Rechteprüfung, die für
// Captains standardmäßig moderator-only bleibt. Nur die Event-/Reihen-bezogenen Seiten wurden gezielt auf
// requireModeratorOr...SquadCaptain umgestellt — alle anderen (Nutzer, Badges, Server, …) bleiben für
// Captains dadurch automatisch verschlossen, ohne dass hier eine Sonderbehandlung nötig ist.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { captainedSquadIds } = await requireModeratorOrAnySquadCaptain();
  const isCaptainOnly = captainedSquadIds !== null;

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 to-purple-950 flex items-center justify-center shadow-lg shadow-purple-900/40">
          <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isCaptainOnly ? "Squad-Verwaltung" : "Admin-Bereich"}
          </h1>
          <p className="text-xs text-gray-500">
            {isCaptainOnly ? "Events und Turniere deines Squads verwalten" : "Verwaltung von Events, Turnieren und Nutzern"}
          </p>
        </div>
      </div>

      <AdminNav isCaptainOnly={isCaptainOnly} />
      {children}
    </div>
  );
}

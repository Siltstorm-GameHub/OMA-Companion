import { requireEventArea } from "@/lib/roles";
import { Shield } from "@/components/icons";
import AdminNav from "./AdminNav";

// Der Gate hier lässt jeden eingeloggten User durch: normale User verwalten hier ihre eigenen
// Community-Events (und Squad-Captains die ihres Squads). Jede einzelne Unterseite hat ihre eigene
// Rechteprüfung — moderator-only bleibt moderator-only. Nur die Event-/Reihen-bezogenen Seiten nutzen
// requireEventArea/requireEventManager/requireSeriesManager; alle anderen (Nutzer, Server, …) bleiben
// für normale User dadurch automatisch verschlossen, ohne dass hier eine Sonderbehandlung nötig ist.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { scope } = await requireEventArea();
  const isRestricted = scope !== null;

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 to-purple-950 flex items-center justify-center shadow-lg shadow-purple-900/40">
          <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isRestricted ? "Event-Verwaltung" : "Admin-Bereich"}
          </h1>
          <p className="text-xs text-gray-500">
            {isRestricted ? "Deine Events und Eventreihen verwalten" : "Verwaltung von Events, Turnieren und Nutzern"}
          </p>
        </div>
      </div>

      <AdminNav isCaptainOnly={isRestricted} />
      {children}
    </div>
  );
}

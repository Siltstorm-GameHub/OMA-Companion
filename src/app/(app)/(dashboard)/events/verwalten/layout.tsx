import { requireEventArea } from "@/lib/roles";
import { CalendarDays } from "@/components/icons";
import EventsSectionNav from "@/components/events/EventsSectionNav";

// Events → Reiter "Verwalten": Anlegen, Bearbeiten, Abschließen von Events und Eventreihen — für
// alle eingeloggten Mitglieder (eigene Events, als Captain die ihres Squads) und Mods/Admins (alle
// Events, Freigaben, ohne Mengenlimits). Bis 2026-11 lag das unter /admin/events bzw. /admin/series;
// alte Links leiten weiter (next.config.ts). Jede Unterseite prüft ihre Rechte selbst
// (requireEventArea / requireEventManager / requireSeriesManager).
export default async function EventsManageLayout({ children }: { children: React.ReactNode }) {
  await requireEventArea();

  return (
    <div className="px-3 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-teal-400" />
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">Events</p>
      </div>
      <EventsSectionNav active="manage" />
      {children}
    </div>
  );
}

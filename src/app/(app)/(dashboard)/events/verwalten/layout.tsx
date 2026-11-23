import { requireEventArea } from "@/lib/roles";
import { loadManageAttentionCount } from "@/lib/admin-inbox";
import { PageHeader } from "@/components/ui/PageHeader";
import EventsSectionNav from "@/components/events/EventsSectionNav";

// Events → Reiter "Verwalten": Anlegen, Bearbeiten, Abschließen von Events und Eventreihen — für
// alle eingeloggten Mitglieder (eigene Events, als Captain die ihres Squads) und Mods/Admins (alle
// Events, Freigaben, ohne Mengenlimits). Bis 2026-11 lag das unter /admin/events bzw. /admin/series;
// alte Links leiten weiter (next.config.ts). Jede Unterseite prüft ihre Rechte selbst
// (requireEventArea / requireEventManager / requireSeriesManager).
// Kopf und Reiter sehen aus wie auf /events, damit "Verwalten" sich wie ein Reiter derselben Seite anfühlt.
export default async function EventsManageLayout({ children }: { children: React.ReactNode }) {
  const { scope } = await requireEventArea();
  const manageCount = await loadManageAttentionCount(scope);

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto w-full min-w-0 space-y-5 animate-fade-in">
      <PageHeader title="Events" />
      <EventsSectionNav active="manage" manageCount={manageCount} />
      {children}
    </div>
  );
}

import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVisibleServers } from "@/lib/gameservers";
import { getServerCandidates } from "@/lib/games/server-candidates-server";
import ServerList from "./ServerList";
import ServerCandidates from "./ServerCandidates";
import { EmptyState } from "@/components/EmptyState";

export default async function ServersPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const [servers, candidates] = await Promise.all([getVisibleServers(userId), getServerCandidates(userId)]);

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Gameserver"
        description="Bewirb dich für Zugang zu unseren Gameservern. Nach Genehmigung durch ein Team-Mitglied siehst du die Zugangsdaten dauerhaft, bis der Zugang von einem Admin entzogen wird."
      />

      {servers.length === 0 ? (
        <EmptyState
          type="gameserver"
          title="Noch keine Gameserver verfügbar"
          description="Sobald das Team einen Community-Server einrichtet, taucht er hier auf."
        />
      ) : (
        <ServerList servers={servers} />
      )}

      <ServerCandidates candidates={candidates} canInterest={!!userId} />
    </div>
  );
}

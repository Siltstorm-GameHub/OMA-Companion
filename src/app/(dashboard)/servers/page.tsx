import { auth } from "@/auth";
import { getVisibleServers } from "@/lib/gameservers";
import ServerList from "./ServerList";
import { EmptyState } from "@/components/EmptyState";

export default async function ServersPage() {
  const session = await auth();
  const servers = await getVisibleServers(session?.user?.id);

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Community-Gameserver</h1>
        <p className="text-sm text-gray-400 mt-1">
          Bewirb dich für Zugang zu unseren Gameservern. Nach Genehmigung durch ein Team-Mitglied siehst du die
          Zugangsdaten dauerhaft, bis der Zugang von einem Admin entzogen wird.
        </p>
      </div>

      {servers.length === 0 ? (
        <EmptyState
          type="gameserver"
          title="Noch keine Gameserver verfügbar"
          description="Sobald das Team einen Community-Server einrichtet, taucht er hier auf."
        />
      ) : (
        <ServerList servers={servers} />
      )}
    </div>
  );
}

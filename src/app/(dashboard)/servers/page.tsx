import { auth } from "@/auth";
import { getVisibleServers } from "@/lib/gameservers";
import ServerCard from "./ServerCard";

export default async function ServersPage() {
  const session = await auth();
  const servers = await getVisibleServers(session?.user?.id);

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Community-Gameserver</h1>
        <p className="text-sm text-gray-400 mt-1">
          Bewirb dich für Zugang zu unseren Gameservern. Nach Genehmigung durch ein Team-Mitglied siehst du die
          Zugangsdaten für 30 Tage — solange du dich regelmäßig verbindest, verlängert sich der Zugang automatisch.
        </p>
      </div>

      {servers.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">Aktuell sind keine Gameserver verfügbar.</p>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={{
                ...server,
                myExpiresAt: server.myExpiresAt ? server.myExpiresAt.toISOString() : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

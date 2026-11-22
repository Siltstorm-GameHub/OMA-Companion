import { requireRole } from "@/lib/roles";
import { getServersWithAdminCounts } from "@/lib/gameservers";
import ServerManager from "./ServerManager";

export default async function AdminServersPage() {
  await requireRole("moderator");

  const withCounts = await getServersWithAdminCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg">Gameserver</h1>
        <p className="text-sm text-gray-400 mt-1">
          Community-Gameserver verwalten. Zugangsdaten werden nur an genehmigte Bewerber ausgegeben.
        </p>
      </div>
      <ServerManager initialServers={withCounts} />
    </div>
  );
}

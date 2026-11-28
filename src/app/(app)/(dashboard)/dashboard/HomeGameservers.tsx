import { getVisibleServers } from "@/lib/gameservers";
import GameserverWidget from "./GameserverWidget";
import { ModuleHeader } from "./HomeModules";

/**
 * Gameserver auf der Übersicht — lädt selbst (Belegung je Server = eine Abfrage pro Server) und steht in einer
 * Suspense-Grenze, damit Bühne und "Heute für dich" nicht darauf warten.
 */
export default async function HomeGameservers({ userId }: { userId: string }) {
  const servers = await getVisibleServers(userId).catch(() => []);
  if (servers.length === 0) return null;
  return (
    <section aria-label="Gameserver">
      <ModuleHeader title="Gameserver" href="/servers" />
      <div className="rounded-card border border-line bg-surface overflow-hidden">
        <GameserverWidget servers={servers} />
      </div>
    </section>
  );
}

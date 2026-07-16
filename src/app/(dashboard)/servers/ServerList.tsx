"use client";
import ServerCard from "./ServerCard";
import { useAllLiveStatus } from "@/lib/useServerLiveStatus";

type Server = Parameters<typeof ServerCard>[0]["server"];

// Sortiert online-Server nach oben, offline-Server nach unten (Reihenfolge innerhalb
// einer Gruppe bleibt wie vom Server geliefert). Server ohne bekannten Live-Status
// (z.B. keine AMP-Instanz hinterlegt) gelten als "online", damit sie nicht ans Ende rutschen.
export default function ServerList({ servers }: { servers: Server[] }) {
  const liveStatus = useAllLiveStatus();
  const sorted = [...servers].sort((a, b) => {
    const aOffline = liveStatus[a.id]?.online === false ? 1 : 0;
    const bOffline = liveStatus[b.id]?.online === false ? 1 : 0;
    return aOffline - bOffline;
  });

  return (
    <div className="space-y-3">
      {sorted.map((server) => (
        <ServerCard key={server.id} server={server} />
      ))}
    </div>
  );
}

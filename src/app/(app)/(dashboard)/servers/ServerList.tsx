"use client";
import ServerCard from "./ServerCard";

type Server = Parameters<typeof ServerCard>[0]["server"];

// Reihenfolge kommt vom Server: online-Server zuerst, offline-Server danach (siehe getVisibleServers).
export default function ServerList({ servers }: { servers: Server[] }) {
  return (
    <div className="space-y-3">
      {servers.map((server) => (
        <ServerCard key={server.id} server={server} />
      ))}
    </div>
  );
}

"use client";
import Link from "next/link";
import { motion } from "motion/react";
import GameCover from "@/components/GameCover";
import { useLiveStatus, useAllLiveStatus } from "@/lib/useServerLiveStatus";

type Server = { id: string; name: string; game: string };

const PRESENCE_ONLINE = "#14b8a6";
const PRESENCE_OFFLINE = "#52525b";

function ServerRow({ server, isLast }: { server: Server; isLast: boolean }) {
  const liveStatus = useLiveStatus(server.id);
  const isOffline = liveStatus?.online === false;
  const isLoading = liveStatus === undefined;

  return (
    <motion.div layout transition={{ type: "spring", stiffness: 380, damping: 32 }}>
      <Link
        href="/servers"
        className="flex items-center gap-3 px-3.5 py-3 transition-all duration-200 group hover:bg-white/[0.035] active:scale-[0.99]"
        style={{
          borderBottom: isLast ? "" : "1px solid rgba(255,255,255,0.05)",
          opacity: isOffline ? 0.55 : 1,
          filter: isOffline ? "grayscale(0.6)" : "none",
        }}
      >
        <div className="transition-transform duration-200 group-hover:scale-110">
          <GameCover game={server.game} className="w-8 h-8" rounded="rounded-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate group-hover:text-teal-300 transition-colors">
            {server.name}
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">{server.game}</p>
        </div>
        {isLoading ? (
          <span className="motion-safe:animate-pulse inline-block h-4 w-14 rounded-full bg-white/10 shrink-0" />
        ) : (
          <span
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0"
            style={{
              color: liveStatus.online ? PRESENCE_ONLINE : PRESENCE_OFFLINE,
              background: liveStatus.online ? "rgba(20,184,166,0.1)" : "rgba(82,82,91,0.1)",
              borderColor: liveStatus.online ? "rgba(20,184,166,0.2)" : "rgba(82,82,91,0.2)",
            }}
          >
            <span
              className={`w-1 h-1 rounded-full ${liveStatus.online ? "motion-safe:animate-pulse" : ""}`}
              style={{ background: liveStatus.online ? PRESENCE_ONLINE : PRESENCE_OFFLINE }}
            />
            {liveStatus.online
              ? `${liveStatus.currentPlayers ?? 0}${liveStatus.maxPlayers !== null ? `/${liveStatus.maxPlayers}` : ""} online`
              : "Offline"}
          </span>
        )}
      </Link>
    </motion.div>
  );
}

export default function GameserverWidget({ servers }: { servers: Server[] }) {
  const liveStatus = useAllLiveStatus();
  // Online-Server zuerst, wie auf der /servers-Übersicht (Reihenfolge innerhalb
  // einer Gruppe bleibt wie geliefert; ohne bekannten Live-Status gilt "online").
  const sorted = [...servers].sort((a, b) => {
    const aOffline = liveStatus[a.id]?.online === false ? 1 : 0;
    const bOffline = liveStatus[b.id]?.online === false ? 1 : 0;
    return aOffline - bOffline;
  });
  const visible = sorted.slice(0, 5);

  return (
    <>
      {visible.map((server, i) => (
        <ServerRow key={server.id} server={server} isLast={i === visible.length - 1} />
      ))}
    </>
  );
}

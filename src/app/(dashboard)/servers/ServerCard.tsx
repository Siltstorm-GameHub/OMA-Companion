"use client";
import { useEffect, useState } from "react";
import { Circle } from "lucide-react";
import GameCover from "@/components/GameCover";
import ApplyButton from "./ApplyButton";
import ServerCredentials from "./ServerCredentials";

type LiveStatus = { online: boolean; currentPlayers: number | null; maxPlayers: number | null };

// Live-Status aller Server wird gemeinsam gepollt und pro Card per Context-losem Hook gelesen,
// um nicht pro Karte einen eigenen Request zu feuern.
const statusListeners = new Set<(status: Record<string, LiveStatus>) => void>();
let latestStatus: Record<string, LiveStatus> = {};
let pollStarted = false;

function startPolling() {
  if (pollStarted) return;
  pollStarted = true;
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/servers/status");
      if (!res.ok) return;
      latestStatus = await res.json();
      statusListeners.forEach((listener) => listener(latestStatus));
    } catch {
      // Netzwerkfehler ignorieren, nächster Poll versucht es erneut
    }
  };
  fetchStatus();
  setInterval(fetchStatus, 20_000);
}

function useLiveStatus(serverId: string): LiveStatus | undefined {
  const [status, setStatus] = useState<LiveStatus | undefined>(latestStatus[serverId]);
  useEffect(() => {
    startPolling();
    const listener = (all: Record<string, LiveStatus>) => setStatus(all[serverId]);
    statusListeners.add(listener);
    return () => {
      statusListeners.delete(listener);
    };
  }, [serverId]);
  return status;
}

type Light = "green" | "yellow" | "red";

const LIGHT_COLOR: Record<Light, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
};

const LIGHT_LABEL: Record<Light, string> = {
  green: "Freie Plätze",
  yellow: "Fast voll",
  red: "Voll",
};

type Server = {
  id: string;
  name: string;
  game: string;
  description: string | null;
  maxSlots: number;
  occupied: number;
  available: number;
  light: Light;
  myStatus: string;
  host?: string;
  port?: string | null;
  password?: string | null;
  connectInfo?: string | null;
};

export default function ServerCard({ server }: { server: Server }) {
  const showCredentials = server.myStatus === "approved" && !!server.host;
  const liveStatus = useLiveStatus(server.id);

  return (
    <div className="rounded-xl glass p-4 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-start gap-3">
        <GameCover game={server.game} className="w-10 h-10" rounded="rounded-lg" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
            {server.name}
            {liveStatus && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  color: liveStatus.online ? "#34d399" : "#f87171",
                  background: liveStatus.online ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                }}
              >
                <Circle className="w-1.5 h-1.5" style={{ fill: "currentColor" }} />
                {liveStatus.online ? "Online" : "Offline"}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">{server.game}</p>
          {server.description && <p className="text-xs text-gray-400 mt-1">{server.description}</p>}
          {liveStatus?.online && liveStatus.currentPlayers !== null && (
            <p className="text-xs text-gray-500 mt-1 tabular-nums">
              {liveStatus.currentPlayers}
              {liveStatus.maxPlayers !== null ? `/${liveStatus.maxPlayers}` : ""} Spieler live
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5" style={{ color: LIGHT_COLOR[server.light], fill: LIGHT_COLOR[server.light] }} />
            <span className="text-xs text-gray-400">{LIGHT_LABEL[server.light]}</span>
          </div>
          <span className="text-xs text-gray-600 tabular-nums">{server.occupied}/{server.maxSlots} Plätze</span>
        </div>
      </div>

      <div className="flex items-center justify-end pt-1 border-t border-white/[0.05]">
        {!showCredentials && (
          <ApplyButton serverId={server.id} status={server.myStatus} isFull={server.available <= 0} />
        )}
      </div>

      {showCredentials && (
        <ServerCredentials
          serverId={server.id}
          host={server.host}
          port={server.port}
          password={server.password}
          connectInfo={server.connectInfo}
        />
      )}
    </div>
  );
}

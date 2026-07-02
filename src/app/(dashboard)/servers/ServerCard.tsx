import { Circle } from "lucide-react";
import GameCover from "@/components/GameCover";
import ApplyButton from "./ApplyButton";
import ServerCredentials from "./ServerCredentials";

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

  return (
    <div className="rounded-xl glass p-4 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-start gap-3">
        <GameCover game={server.game} className="w-10 h-10" rounded="rounded-lg" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{server.name}</p>
          <p className="text-xs text-gray-500">{server.game}</p>
          {server.description && <p className="text-xs text-gray-400 mt-1">{server.description}</p>}
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

"use client";
import GameCover from "@/components/GameCover";
import ApplyButton from "./ApplyButton";
import ServerCredentials from "./ServerCredentials";
import { useLiveStatus } from "@/lib/useServerLiveStatus";

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

const PRESENCE_ONLINE = "#14b8a6"; // Marken-Teal, konsistent mit dem Presence-Dot-Konzept
const PRESENCE_OFFLINE = "#52525b"; // neutrales Grau — "offline" ist kein Fehlerzustand, keine Warnfarbe

// Presence-Dot auf dem Server-Cover (Discord/Slack-Muster): zeigt live an, ob das Spiel
// selbst bereit ist. Bewusst getrennt vom Kapazitätsbalken rechts, der die Plätze zeigt —
// unterschiedliche Form (Dot auf Avatar vs. Balken im Textblock) und Bedeutung.
function PresenceDot({ online }: { online: boolean }) {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3" aria-hidden="true">
      {online && (
        <span
          className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
          style={{ background: PRESENCE_ONLINE }}
        />
      )}
      <span
        className="relative inline-flex h-3 w-3 rounded-full border-2"
        style={{ background: online ? PRESENCE_ONLINE : PRESENCE_OFFLINE, borderColor: "var(--bg-surface)" }}
      />
    </span>
  );
}

// Kapazitätsbalken für freie Plätze — bewusst ein Balken statt eines Punkts,
// damit er nicht mit dem Online/Offline-Presence-Dot verwechselt wird.
function CapacityBar({ occupied, maxSlots, light }: { occupied: number; maxSlots: number; light: Light }) {
  const percent = maxSlots > 0 ? Math.min(100, (occupied / maxSlots) * 100) : 0;
  return (
    <div className="flex flex-col items-end gap-1 shrink-0 w-24">
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-semibold text-white tabular-nums">{occupied}</span>
        <span className="text-[10px] text-gray-500 tabular-nums">/ {maxSlots} Plätze</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%`, background: LIGHT_COLOR[light] }}
        />
      </div>
      <span className="text-[10px] font-medium" style={{ color: LIGHT_COLOR[light] }}>
        {LIGHT_LABEL[light]}
      </span>
    </div>
  );
}

export default function ServerCard({ server }: { server: Server }) {
  const showCredentials = server.myStatus === "approved" && !!server.host;
  const liveStatus = useLiveStatus(server.id);
  const isOffline = liveStatus?.online === false;

  return (
    <div
      className="rounded-xl glass p-4 space-y-3 transition-[opacity,filter,box-shadow] duration-300 hover:shadow-[var(--shadow-card-hover)]"
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        opacity: isOffline ? 0.55 : 1,
        filter: isOffline ? "grayscale(0.6)" : "none",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <GameCover game={server.game} className="w-10 h-10" rounded="rounded-lg" />
          {liveStatus && <PresenceDot online={liveStatus.online} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{server.name}</p>
          <p className="text-xs text-gray-500">{server.game}</p>
          {liveStatus?.online && liveStatus.currentPlayers !== null ? (
            <p className="text-xs mt-1 tabular-nums" style={{ color: PRESENCE_ONLINE }}>
              {liveStatus.currentPlayers}
              {liveStatus.maxPlayers !== null ? `/${liveStatus.maxPlayers}` : ""} Spieler online
            </p>
          ) : liveStatus && !liveStatus.online ? (
            <p className="text-xs text-gray-500 mt-1">Server offline</p>
          ) : null}
          {server.description && <p className="text-xs text-gray-400 mt-1">{server.description}</p>}
        </div>
        <CapacityBar occupied={server.occupied} maxSlots={server.maxSlots} light={server.light} />
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

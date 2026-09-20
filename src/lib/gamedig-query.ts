// Direkte Live-Status-Abfrage für Gameserver ohne AMP (z.B. Docker-Container auf einem
// anderen Server/Netzwerk): fragt das Spiel-eigene Query-Protokoll (Valve/A2S, GameDig)
// direkt an. Für "sdtd" (7 Days to Die) liefert das reine A2S-Protokoll keine Spielernamen —
// dafür optional Telnet-Zugangsdaten (queryTelnetPort/queryTelnetPassword) mitgeben.
import { GameDig } from "gamedig";

export type QueryStatus = {
  online: boolean;
  currentPlayers: number | null;
  maxPlayers: number | null;
  players: string[] | null;
};

const OFFLINE: QueryStatus = { online: false, currentPlayers: null, maxPlayers: null, players: null };

export async function queryGameServer(
  host: string,
  port: string | null,
  gamedigType: string,
  telnetPort?: string | null,
  telnetPassword?: string | null
): Promise<QueryStatus> {
  if (!port) return OFFLINE;

  try {
    // Kurze Timeouts: ein nicht erreichbarer Server darf den Status-Endpunkt nicht blockieren
    // (GameDig-Default wären bis zu ~30 s, das reißt das Serverless-Zeitlimit und nimmt auch AMP-Server den Status).
    const result = await GameDig.query({
      type: gamedigType,
      host,
      port: Number(port),
      maxRetries: 0,
      socketTimeout: 2000,
      attemptTimeout: 4000,
      ...(telnetPort && telnetPassword ? { telnetPort: Number(telnetPort), telnetPassword } : {}),
    });

    return {
      online: true,
      currentPlayers: result.numplayers,
      maxPlayers: result.maxplayers,
      players: result.players.length > 0 ? result.players.map((p) => p.name).filter((n): n is string => !!n) : null,
    };
  } catch {
    // Server offline, nicht erreichbar oder Query-Timeout — Seite bleibt nutzbar, nur ohne Live-Status.
    return OFFLINE;
  }
}

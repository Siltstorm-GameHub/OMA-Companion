import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInstances, toInstanceStatus } from "@/lib/amp";
import { queryGameServer } from "@/lib/gamedig-query";
import { statusSourceOf } from "@/lib/gameserver-input";

type StatusEntry = { online: boolean; currentPlayers: number | null; maxPlayers: number | null; players: string[] | null };

// Der Endpunkt ist öffentlich und wird von jedem offenen Tab alle 20 s gepollt. Damit nicht jeder
// Aufruf frische AMP-/GameDig-Abfragen auslöst, wird das Ergebnis kurz zwischengespeichert
// (pro Server-Instanz im Speicher, zusätzlich per Cache-Control im CDN). Parallele Aufrufe
// während einer laufenden Abfrage warten auf dieselbe Abfrage.
const CACHE_TTL_MS = 15_000;
let cached: { at: number; data: Record<string, StatusEntry> } | null = null;
let inFlight: Promise<Record<string, StatusEntry>> | null = null;

const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" };

// Öffentlicher Live-Status: online/offline + Spielerzahl (+ ggf. Spielernamen) pro Server,
// keyed by gameserver.id. Keine sensiblen Daten (Host/Passwort) — die bleiben weiterhin
// hinter der Bewerbungs-Freigabe.
export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { headers: CACHE_HEADERS });
  }
  inFlight ??= loadStatus()
    .then((data) => {
      cached = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return NextResponse.json(await inFlight, { headers: CACHE_HEADERS });
}

async function loadStatus(): Promise<Record<string, StatusEntry>> {
  const servers = await prisma.gameServer.findMany({
    where: { isActive: true, OR: [{ ampInstanceId: { not: null } }, { queryType: { in: ["amp", "gamedig"] } }] },
    select: {
      id: true, ampInstanceId: true, queryType: true, gamedigType: true,
      host: true, port: true, queryPort: true, queryTelnetPort: true, queryTelnetPassword: true,
    },
  });

  const result: Record<string, StatusEntry> = {};
  if (servers.length === 0) return result;

  const ampServers = servers.filter((s) => statusSourceOf(s) === "amp" && s.ampInstanceId);
  const gamedigServers = servers.filter((s) => statusSourceOf(s) === "gamedig" && s.gamedigType);

  // AMP und direkte Abfragen laufen parallel, damit ein hängender Server die anderen nicht ausbremst.
  await Promise.all([
    (async () => {
      if (ampServers.length === 0) return;
      try {
        const instances = await getInstances();
        const statusByInstanceId = new Map(instances.map((instance) => [instance.InstanceID, toInstanceStatus(instance)]));
        for (const server of ampServers) {
          const status = server.ampInstanceId ? statusByInstanceId.get(server.ampInstanceId) : undefined;
          if (status) {
            result[server.id] = { online: status.online, currentPlayers: status.currentPlayers, maxPlayers: status.maxPlayers, players: null };
          }
        }
      } catch (err) {
        // AMP nicht erreichbar o.ä. — Seite bleibt nutzbar, nur ohne Live-Status für diese Server.
        console.error("[servers/status] AMP-Abfrage fehlgeschlagen:", err);
      }
    })(),
    ...gamedigServers.map(async (server) => {
      result[server.id] = await queryGameServer(
        server.host, server.queryPort ?? server.port, server.gamedigType!,
        server.queryTelnetPort, server.queryTelnetPassword
      );
    }),
  ]);

  return result;
}

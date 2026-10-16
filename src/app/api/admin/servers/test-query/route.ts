import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getInstances, toInstanceStatus } from "@/lib/amp";
import { queryGameServerOrThrow } from "@/lib/gamedig-query";
import { isValidPort } from "@/lib/gameserver-input";

// "Abfrage testen" im Admin-Formular: prüft die eingetragene Live-Status-Quelle sofort,
// bevor gespeichert wird — mit Fehlergrund statt stillem "offline".
export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const body = (await req.json().catch(() => ({}))) as {
    queryType?: string;
    ampInstanceId?: string;
    host?: string;
    port?: string;
    queryPort?: string;
    gamedigType?: string;
    queryTelnetPort?: string;
    queryTelnetPassword?: string;
  };

  try {
    if (body.queryType === "amp") {
      const ampInstanceId = body.ampInstanceId?.trim();
      if (!ampInstanceId) return NextResponse.json({ error: "Keine AMP Instance-ID angegeben" }, { status: 400 });
      const instance = (await getInstances()).find((i) => i.InstanceID === ampInstanceId);
      if (!instance) return NextResponse.json({ error: "AMP-Instanz nicht gefunden" }, { status: 404 });
      const { online, currentPlayers, maxPlayers } = toInstanceStatus(instance);
      return NextResponse.json({ online, currentPlayers, maxPlayers: maxPlayers || null, players: null });
    }

    if (body.queryType === "gamedig") {
      const host = body.host?.trim();
      const gamedigType = body.gamedigType?.trim();
      const port = body.queryPort?.trim() || body.port?.trim() || null;
      if (!host) return NextResponse.json({ error: "Kein Host / IP angegeben" }, { status: 400 });
      if (!gamedigType) return NextResponse.json({ error: "Kein GameDig-Typ angegeben" }, { status: 400 });
      if (!port || !isValidPort(port)) return NextResponse.json({ error: "Kein gültiger Port bzw. Query-Port angegeben" }, { status: 400 });
      const telnetPort = body.queryTelnetPort?.trim() || null;
      const telnetPassword = body.queryTelnetPassword?.trim() || null;
      return NextResponse.json(await queryGameServerOrThrow(host, port, gamedigType, telnetPort, telnetPassword));
    }

    return NextResponse.json({ error: "Keine Live-Status-Quelle gewählt" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Abfrage fehlgeschlagen" },
      { status: 502 }
    );
  }
}

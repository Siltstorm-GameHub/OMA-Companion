import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRoomConfig, roomVisibleFor, type RoomConfig } from "./room-config";

/**
 * Gemeinsame Eintrittsprüfung aller Zimmer- und Job-Routen:
 * eingeloggt UND das Zimmer für diesen User freigeschaltet.
 *
 * Solange room_enabled aus ist, kommen nur Admins durch — so lässt sich das
 * Feature live fertigbauen, ohne es allen zu zeigen.
 */
export async function requireRoomAccess(): Promise<
  { userId: string; role: string; cfg: RoomConfig } | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 }) };
  }

  const role = (session.user as { role?: string }).role ?? "user";
  const cfg  = await getRoomConfig();
  if (!roomVisibleFor(cfg, role)) {
    return {
      response: NextResponse.json(
        { error: "Das Gaming-Zimmer ist noch nicht freigeschaltet" },
        { status: 503 },
      ),
    };
  }

  return { userId: session.user.id, role, cfg };
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMancaveConfig, mancaveVisibleFor, type MancaveConfig } from "./mancave-config";

/**
 * Eintrittsprüfung aller Mancave-Routen: eingeloggt UND die Mancave für
 * diesen User freigeschaltet. Gleiches Muster wie requireRoomAccess.
 */
export async function requireMancaveAccess(): Promise<
  { userId: string; role: string; cfg: MancaveConfig } | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 }) };
  }

  const role = (session.user as { role?: string }).role ?? "user";
  const cfg  = await getMancaveConfig();
  if (!mancaveVisibleFor(cfg, role)) {
    return {
      response: NextResponse.json(
        { error: "Die Mancave ist noch nicht freigeschaltet" },
        { status: 503 },
      ),
    };
  }

  return { userId: session.user.id, role, cfg };
}

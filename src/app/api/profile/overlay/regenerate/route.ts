import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { regenerateUserOverlayToken, buildStreamerOverlayUrl } from "@/lib/overlay";
import { invalidateStreamerConfig } from "@/lib/overlay-state";

/** Erzeugt einen neuen Overlay-Token — der alte Link (z.B. versehentlich im Stream gezeigt)
 *  funktioniert danach nicht mehr. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const token = await regenerateUserOverlayToken(session.user.id);
  invalidateStreamerConfig(session.user.id);
  return NextResponse.json({ overlayUrl: buildStreamerOverlayUrl(session.user.id, token) });
}

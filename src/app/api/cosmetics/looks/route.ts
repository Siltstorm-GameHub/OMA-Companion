import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getUserLooks } from "@/lib/cosmetics/service";

export const dynamic = "force-dynamic";

/**
 * GET ?ids=a,b,c (max. 100) — sichtbare Kosmetik (Rahmen, Aura, Namensfarbe, Titel) vieler User auf
 * einmal. Die Anfragen aller Avatare einer Seite bündelt useUserLook. Antwort: { [userId]: UserLook }.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 100);
  return NextResponse.json(await getUserLooks(ids), {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

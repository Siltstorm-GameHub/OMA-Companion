import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { setSpecialties } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** PUT { specialties: string[] } — eigene Spezialgebiete (Spiele/Sprachen) setzen, max. 6. */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { specialties } = await req.json().catch(() => ({}));
  if (!Array.isArray(specialties) || !specialties.every((s: unknown) => typeof s === "string")) {
    return NextResponse.json({ error: "specialties (Liste von Texten) erforderlich" }, { status: 400 });
  }

  const result = await setSpecialties(user.id, specialties);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

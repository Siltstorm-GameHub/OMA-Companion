import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { setSlotOverride } from "@/lib/community-job-config";

/** PATCH { jobKey, maxSlots: number | null } — Slot-Zahl überschreiben oder auf Katalog-Default zurücksetzen. */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { jobKey, maxSlots } = await req.json().catch(() => ({}));
  if (typeof jobKey !== "string" || (maxSlots !== null && typeof maxSlots !== "number")) {
    return NextResponse.json({ error: "jobKey und maxSlots (number|null) erforderlich" }, { status: 400 });
  }

  await setSlotOverride(jobKey, maxSlots);
  return NextResponse.json({ ok: true });
}

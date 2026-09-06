import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { getTestModeEnabled, setTestModeEnabled } from "@/lib/community-job-config";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  return NextResponse.json({ enabled: await getTestModeEnabled() });
}

/** PATCH { enabled: boolean } — Admin-Testmodus global an-/ausschalten. */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const { enabled } = await req.json().catch(() => ({}));
  if (typeof enabled !== "boolean") return NextResponse.json({ error: "enabled (boolean) erforderlich" }, { status: 400 });

  await setTestModeEnabled(enabled);
  return NextResponse.json({ ok: true });
}

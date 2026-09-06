import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { applyForJob } from "@/lib/community-job-service";
import { getTestModeEnabled } from "@/lib/community-job-config";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { jobKey, message } = await req.json().catch(() => ({ jobKey: null, message: undefined }));
  if (typeof jobKey !== "string" || !jobKey) {
    return NextResponse.json({ error: "Job fehlt" }, { status: 400 });
  }

  // Admin-Testmodus: Admins können bei aktiviertem Schalter Jobs ohne Sperrfrist/Slot-Limit wechseln.
  const adminTestBypass = hasMinRole(user.role, "admin") && await getTestModeEnabled();

  const result = await applyForJob(user.id, jobKey, typeof message === "string" ? message : undefined, { adminTestBypass });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

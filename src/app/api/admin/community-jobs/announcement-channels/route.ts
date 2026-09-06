import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { getAnnouncementChannelOverrides, setAnnouncementChannel } from "@/lib/community-job-config";

export const dynamic = "force-dynamic";

/** Aktuelle Kanal-Zuordnung je Job (leer = Fallback auf DISCORD_COMMUNITY_JOBS_CHANNEL_ID). */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  return NextResponse.json({ overrides: await getAnnouncementChannelOverrides() });
}

/** PATCH { jobKey, channelId: string | null } — Kanal für einen Job setzen oder auf Fallback zurücksetzen. */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { jobKey, channelId } = await req.json().catch(() => ({}));
  if (typeof jobKey !== "string" || !jobKey) {
    return NextResponse.json({ error: "jobKey fehlt" }, { status: 400 });
  }
  if (channelId !== null && typeof channelId !== "string") {
    return NextResponse.json({ error: "channelId muss String oder null sein" }, { status: 400 });
  }

  await setAnnouncementChannel(jobKey, channelId);
  return NextResponse.json({ ok: true });
}

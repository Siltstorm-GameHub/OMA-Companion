import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { COMMUNITY_JOBS } from "@/lib/community-jobs";
import { getJobTextOverrides, setJobTextOverride } from "@/lib/community-job-config";
import { logAdminAction } from "@/lib/community-admin-audit";

export const dynamic = "force-dynamic";

/** Standardtexte (aus dem Code) + aktuelle Überschreibungen je Job. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const overrides = await getJobTextOverrides();
  return NextResponse.json({
    jobs: COMMUNITY_JOBS.map(j => ({
      key: j.key, label: j.label, emoji: j.emoji,
      defaults: { description: j.description, officeGuideMarkdown: j.officeGuideMarkdown },
      overrides: overrides[j.key] ?? {},
    })),
  });
}

/** PATCH { jobKey, description?: string | null, officeGuideMarkdown?: string | null } — null/leer = Standardtext. */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasMinRole(user.role, "moderator")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const { jobKey, description, officeGuideMarkdown } = await req.json().catch(() => ({}));
  if (typeof jobKey !== "string" || !COMMUNITY_JOBS.some(j => j.key === jobKey)) return NextResponse.json({ error: "Unbekannter Job" }, { status: 400 });
  for (const v of [description, officeGuideMarkdown]) {
    if (v !== undefined && v !== null && (typeof v !== "string" || v.length > 4000)) return NextResponse.json({ error: "Text ungültig oder zu lang (max. 4000 Zeichen)" }, { status: 400 });
  }
  await setJobTextOverride(jobKey, { description, officeGuideMarkdown });
  await logAdminAction(user, { action: "texts_change", targetType: "job", jobKey, detail: { description: description !== undefined, officeGuideMarkdown: officeGuideMarkdown !== undefined } });
  return NextResponse.json({ ok: true });
}

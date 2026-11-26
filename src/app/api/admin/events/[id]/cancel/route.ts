import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireEventManager } from "@/lib/roles";
import { cancelEvent } from "@/lib/event-cancel";

/** POST /api/admin/events/[id]/cancel — Termin absagen ("fällt aus"), siehe lib/event-cancel.ts. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireEventManager(id);
  const result = await cancelEvent(id, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  revalidateTag("dashboard-global", { expire: 0 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { handoffJob } from "@/lib/community-job-service";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { targetApplicationId } = await req.json().catch(() => ({ targetApplicationId: null }));
  if (typeof targetApplicationId !== "string" || !targetApplicationId) {
    return NextResponse.json({ error: "Bewerbung fehlt" }, { status: 400 });
  }

  const result = await handoffJob(user.id, targetApplicationId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

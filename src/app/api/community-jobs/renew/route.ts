import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { renewContract } from "@/lib/community-job-service";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const result = await renewContract(user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

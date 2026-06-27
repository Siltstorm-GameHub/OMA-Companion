import { NextRequest, NextResponse } from "next/server";
import { getTwitchUser } from "@/lib/twitch";
import { requireRole } from "@/lib/roles";

export async function GET(req: NextRequest) {
  await requireRole("moderator");
  const login = req.nextUrl.searchParams.get("login");
  if (!login) return NextResponse.json({ error: "login required" }, { status: 400 });
  const user = await getTwitchUser(login.trim().toLowerCase());
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(user);
}

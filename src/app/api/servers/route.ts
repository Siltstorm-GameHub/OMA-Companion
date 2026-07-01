import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVisibleServers } from "@/lib/gameservers";

export async function GET() {
  const session = await auth();
  const servers = await getVisibleServers(session?.user?.id);
  return NextResponse.json(servers);
}

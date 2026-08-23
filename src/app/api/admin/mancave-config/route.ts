import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getMancaveConfig, setMancaveEnabled, setMancaveDevFreeMode } from "@/lib/mancave-config";

export async function GET() {
  await requireRole("admin");
  return NextResponse.json(await getMancaveConfig());
}

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  if (!body || (typeof body.mancaveEnabled !== "boolean" && typeof body.devFreeMode !== "boolean")) {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }
  if (typeof body.mancaveEnabled === "boolean") await setMancaveEnabled(body.mancaveEnabled);
  if (typeof body.devFreeMode === "boolean") await setMancaveDevFreeMode(body.devFreeMode);
  return NextResponse.json(await getMancaveConfig());
}

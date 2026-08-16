import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getRoomConfig, updateRoomConfig, type RoomConfig } from "@/lib/room-config";

export async function GET() {
  await requireRole("admin");
  return NextResponse.json(await getRoomConfig());
}

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }

  const patch: Partial<RoomConfig> = {};
  if (typeof body.roomEnabled === "boolean") patch.roomEnabled = body.roomEnabled;
  if (typeof body.jobsEnabled === "boolean") patch.jobsEnabled = body.jobsEnabled;

  // Zahlenwerte einklemmen, damit ein Tippfehler im Admin-Panel nicht die
  // Ökonomie sprengt (0 Stunden Deckel = nie Lohn, 10000 % = Münzflut).
  const clampNum = (v: unknown, min: number, max: number): number | undefined => {
    if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
    return Math.min(max, Math.max(min, Math.round(v)));
  };
  const cap  = clampNum(body.wageCapHours, 1, 168);
  const mult = clampNum(body.wageMultiplierPct, 0, 500);
  const lock = clampNum(body.hireLockHours, 0, 168);
  if (cap  !== undefined) patch.wageCapHours      = cap;
  if (mult !== undefined) patch.wageMultiplierPct = mult;
  if (lock !== undefined) patch.hireLockHours     = lock;

  // Drei aufsteigende Schwellenwerte für Stufe 1/2/3 — Reihenfolge wird hier
  // erzwungen (nicht nur geklemmt), sonst könnte ein Vertipper Stufe 2 unter
  // Stufe 1 setzen und roomLevel() liefert nie mehr Stufe 2.
  if (Array.isArray(body.levelThresholds) && body.levelThresholds.length === 3) {
    const nums = body.levelThresholds.map((v: unknown) => clampNum(v, 0, 10_000_000));
    if (nums.every((n: number | undefined) => n !== undefined) && nums[0] < nums[1] && nums[1] < nums[2]) {
      patch.levelThresholds = nums as [number, number, number];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nichts zu ändern" }, { status: 400 });
  }

  await updateRoomConfig(patch);
  return NextResponse.json(await getRoomConfig());
}

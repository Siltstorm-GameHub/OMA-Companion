import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { JOBS } from "@/lib/jobs";
import { getJobOverrides, setJobOverride, getEffectiveJobs } from "@/lib/job-config";

/** Job-Katalog + effektive (Admin-Override oder Default) Werte, fürs Admin-Panel. */
export async function GET() {
  await requireRole("admin");
  const [overrides, effective] = await Promise.all([getJobOverrides(), getEffectiveJobs()]);
  const effectiveMap = new Map(effective.map(j => [j.key, j]));
  const jobs = JOBS.map(def => ({
    key: def.key, label: def.label, emoji: def.emoji, minTier: def.minTier,
    defaultCoinsPerHour: def.coinsPerHour, defaultMinRoomTier: def.minRoomTier,
    coinsPerHour: effectiveMap.get(def.key)?.coinsPerHour ?? def.coinsPerHour,
    minRoomTier:  effectiveMap.get(def.key)?.minRoomTier ?? def.minRoomTier,
    overridden: def.key in overrides,
  }));
  return NextResponse.json({ jobs });
}

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  const jobKey = body?.jobKey;
  if (typeof jobKey !== "string" || !JOBS.some(j => j.key === jobKey)) {
    return NextResponse.json({ error: "Unbekannter Job" }, { status: 400 });
  }

  // reset:true = Override löschen, zurück auf Katalog-Default
  if (body?.reset === true) {
    const overrides = await setJobOverride(jobKey, null);
    return NextResponse.json({ overrides });
  }

  const { coinsPerHour, minRoomTier } = body ?? {};
  if (
    (coinsPerHour !== undefined && (typeof coinsPerHour !== "number" || !Number.isFinite(coinsPerHour) || coinsPerHour < 0)) ||
    (minRoomTier !== undefined && (typeof minRoomTier !== "number" || !Number.isInteger(minRoomTier) || minRoomTier < 1 || minRoomTier > 4))
  ) {
    return NextResponse.json({ error: "Ungültige Werte (Lohn ≥ 0, Mancave-Stufe 1-4)" }, { status: 400 });
  }
  if (coinsPerHour === undefined && minRoomTier === undefined) {
    return NextResponse.json({ error: "Kein Wert übergeben" }, { status: 400 });
  }

  const overrides = await setJobOverride(jobKey, { coinsPerHour, minRoomTier });
  return NextResponse.json({ overrides });
}

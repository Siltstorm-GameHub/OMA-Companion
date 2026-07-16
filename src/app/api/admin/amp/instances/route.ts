import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getInstances, getInstancesRaw, toInstanceStatus } from "@/lib/amp";

// Admin-Test-Endpoint: listet alle AMP-Instanzen mit ID/Name/Status auf,
// damit man jeder gameserver-Zeile die passende ampInstanceId zuordnen kann.
// ?debug=1 gibt zusätzlich die rohe AMP-Antwort zurück (falls das Parsing wieder danebenliegt).
export async function GET(req: NextRequest) {
  await requireRole("moderator");
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  try {
    if (debug) {
      return NextResponse.json(await getInstancesRaw());
    }
    const instances = await getInstances();
    return NextResponse.json(
      instances.map((instance) => ({
        name: instance.FriendlyName || instance.InstanceName,
        module: instance.ModuleDisplayName,
        ...toInstanceStatus(instance),
      }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AMP-Abfrage fehlgeschlagen" },
      { status: 502 }
    );
  }
}

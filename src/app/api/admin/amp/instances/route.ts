import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getInstances, toInstanceStatus } from "@/lib/amp";

// Admin-Test-Endpoint: listet alle AMP-Instanzen mit ID/Name/Status auf,
// damit man jeder gameserver-Zeile die passende ampInstanceId zuordnen kann.
export async function GET() {
  await requireRole("moderator");

  try {
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

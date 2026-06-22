import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const body = await req.json() as { keys?: unknown };
  if (!Array.isArray(body.keys) || body.keys.length > 3) {
    return NextResponse.json({ error: "Ungültige Auswahl" }, { status: 400 });
  }
  const keys = body.keys.filter((k): k is string => typeof k === "string").slice(0, 3);

  await prisma.user.update({
    where: { id: me.id },
    data: { showcaseBadgesJson: JSON.stringify(keys) },
  });

  return NextResponse.json({ ok: true });
}

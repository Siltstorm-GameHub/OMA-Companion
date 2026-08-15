import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { VITRINE_TOTAL_SLOTS, parseSlotValue, parseVitrineSlotsJson } from "@/lib/room-vitrine";

/**
 * Setzt/leert ein einzelnes Vitrinen-Fach. Body:
 * - `{ slot, mode: "set", value }`   → Fach zeigt genau dieses Stück
 * - `{ slot, mode: "clear" }`        → Fach bewusst leer (kein Auto-Fill)
 * - `{ slot, mode: "auto" }`         → Fach wieder der Standardbelegung überlassen
 *
 * `value` wird gegen den tatsächlichen Besitz des Users geprüft — sonst
 * könnte man sich fremde Pokale/Abzeichen in die eigene Vitrine stellen.
 */
export async function PATCH(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const body = await req.json() as { slot?: unknown; mode?: unknown; value?: unknown };
  const slot = body.slot;
  const mode = body.mode;
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 0 || slot >= VITRINE_TOTAL_SLOTS) {
    return NextResponse.json({ error: "Ungültiges Fach" }, { status: 400 });
  }
  if (mode !== "set" && mode !== "clear" && mode !== "auto") {
    return NextResponse.json({ error: "Ungültiger Modus" }, { status: 400 });
  }

  if (mode === "set") {
    if (typeof body.value !== "string") {
      return NextResponse.json({ error: "Ungültige Auswahl" }, { status: 400 });
    }
    const parsed = parseSlotValue(body.value);
    if (!parsed) return NextResponse.json({ error: "Ungültige Auswahl" }, { status: 400 });

    const owns = await checkOwnership(me.id, parsed);
    if (!owns) return NextResponse.json({ error: "Das gehört dir nicht" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: me.id }, select: { vitrineSlotsJson: true } });
  const current = parseVitrineSlotsJson(user?.vitrineSlotsJson);

  if (mode === "auto") {
    delete current[slot];
  } else if (mode === "clear") {
    current[slot] = null;
  } else {
    current[slot] = body.value as string;
  }

  await prisma.user.update({
    where: { id: me.id },
    data:  { vitrineSlotsJson: JSON.stringify(current) },
  });

  return NextResponse.json({ ok: true });
}

async function checkOwnership(
  userId: string,
  parsed: NonNullable<ReturnType<typeof parseSlotValue>>,
): Promise<boolean> {
  if (parsed.kind === "pokal") {
    const row = await prisma.pokal.findUnique({ where: { id: parsed.id }, select: { userId: true } });
    return row?.userId === userId;
  }
  if (parsed.kind === "trophy") {
    const row = await prisma.wanderpocalHolder.findFirst({
      where:  { userId, scopeType: parsed.scopeType, scopeValue: parsed.scopeValue },
      select: { id: true },
    });
    return !!row;
  }
  // Badges: System-Keys werden gegen die verdienten Abzeichen des Users
  // geprüft (aus computeBadges, nicht in der DB), Custom-Badges gegen die
  // Vergabe-Tabelle.
  const CUSTOM_PREFIX = "custom:";
  if (parsed.key.startsWith(CUSTOM_PREFIX)) {
    const customBadgeId = parsed.key.slice(CUSTOM_PREFIX.length);
    const row = await prisma.userCustomBadge.findUnique({
      where:  { userId_customBadgeId: { userId, customBadgeId } },
      select: { userId: true },
    });
    return !!row;
  }
  const row = await prisma.userSystemBadge.findUnique({
    where:  { userId_badgeKey: { userId, badgeKey: parsed.key } },
    select: { userId: true },
  });
  return !!row;
}

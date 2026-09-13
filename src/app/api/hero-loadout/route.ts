import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// Eigenes Loadout lesen -- Klasse + ausgerüstete Accessoires je Slot.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const loadout = await prisma.userHeroLoadout.findUnique({
    where: { userId: user.id },
    include: { equipment: { select: { slot: true, accessoryId: true } } },
  });

  return NextResponse.json({ loadout });
}

// Eigenes Loadout anlegen/ändern -- Klasse ist jederzeit wechselbar, ebenso
// die Ausrüstung je Slot (leerer Wert für einen Slot entfernt ihn wieder).
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json() as {
    classKey?: string;
    equipment?: Record<string, string | null>;
  };

  if (!body.classKey?.trim()) {
    return NextResponse.json({ error: "classKey ist Pflicht" }, { status: 400 });
  }

  const loadout = await prisma.$transaction(async tx => {
    const upserted = await tx.userHeroLoadout.upsert({
      where: { userId: user.id },
      create: { id: randomUUID(), userId: user.id, classKey: body.classKey!.trim() },
      update: { classKey: body.classKey!.trim() },
    });

    for (const [slot, accessoryId] of Object.entries(body.equipment ?? {})) {
      if (!accessoryId) {
        await tx.userHeroEquipment.deleteMany({ where: { loadoutId: upserted.id, slot } }).catch(() => null);
        continue;
      }
      // Nur echte Accessoire-IDs dieser Kategorie zulassen -- verhindert,
      // dass ein Client eine falsche Kategorie/ID unterschiebt.
      const accessory = await tx.heroAccessory.findUnique({ where: { id: accessoryId } });
      if (!accessory || accessory.slot !== slot) continue;

      await tx.userHeroEquipment.upsert({
        where: { loadoutId_slot: { loadoutId: upserted.id, slot } },
        create: { id: randomUUID(), loadoutId: upserted.id, slot, accessoryId },
        update: { accessoryId },
      });
    }

    return tx.userHeroLoadout.findUnique({
      where: { id: upserted.id },
      include: { equipment: { select: { slot: true, accessoryId: true } } },
    });
  });

  return NextResponse.json({ loadout });
}

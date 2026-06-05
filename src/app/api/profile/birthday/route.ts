import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { birthday } = await req.json(); // "MM-DD" Format oder null

  if (birthday !== null && !/^\d{2}-\d{2}$/.test(birthday))
    return NextResponse.json({ error: "Format: MM-DD" }, { status: 400 });

  // Als Datum speichern (Jahr ist egal, wir nutzen 2000 als Platzhalter)
  const dateValue = birthday ? new Date(`2000-${birthday}`) : null;
  if (dateValue && isNaN(dateValue.getTime()))
    return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });

  await prisma.user.update({ where: { id: session.user.id }, data: { birthday: dateValue } });
  return NextResponse.json({ ok: true });
}

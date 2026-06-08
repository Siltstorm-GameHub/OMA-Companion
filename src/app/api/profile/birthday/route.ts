import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { birthday } = await req.json(); // "DD-MM" Format oder null

  if (birthday !== null && !/^\d{2}-\d{2}$/.test(birthday))
    return NextResponse.json({ error: "Format: TT-MM" }, { status: 400 });

  // Als Datum speichern (Jahr ist egal, wir nutzen 2000 als Platzhalter)
  // Eingabe ist TT-MM → umdrehen zu MM-DD für Date-Konstruktor
  const dateValue = birthday ? new Date(`2000-${birthday.split("-").reverse().join("-")}`) : null;
  if (dateValue && isNaN(dateValue.getTime()))
    return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });

  await prisma.user.update({ where: { id: session.user.id }, data: { birthday: dateValue } });
  return NextResponse.json({ ok: true });
}

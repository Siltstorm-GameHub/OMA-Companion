import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id?: string; all?: boolean };

  if (body.all) {
    await prisma.inAppNotification.deleteMany({ where: { userId: session.user.id } });
  } else if (body.id) {
    await prisma.inAppNotification.deleteMany({
      where: { id: body.id, userId: session.user.id },
    });
  }

  return NextResponse.json({ ok: true });
}

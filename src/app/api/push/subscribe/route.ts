import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Subscription speichern
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const endpoint = body?.endpoint as string | undefined;
  const p256dh   = body?.keys?.p256dh as string | undefined;
  const auth_key = body?.keys?.auth   as string | undefined;

  if (!endpoint || !p256dh || !auth_key) {
    return NextResponse.json({ error: "Ungültige Subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.user.id, endpoint, p256dh, auth: auth_key },
    update: { userId: session.user.id, p256dh, auth: auth_key },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: Subscription entfernen
// Body ohne endpoint → alle Subscriptions dieses Users löschen (Reset)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { endpoint } = body as { endpoint?: string };

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });
  } else {
    // Alle Subscriptions dieses Users löschen
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id },
    });
  }

  return NextResponse.json({ ok: true });
}

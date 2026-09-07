import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * DELETE /api/widget/events/[id]/registrations/[userId]
 * Identische Semantik zu PATCH /api/admin/events { removeUserId }.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId, userId } = await params;
  await prisma.eventRegistration.deleteMany({ where: { eventId, userId } });
  return NextResponse.json({ success: true });
}

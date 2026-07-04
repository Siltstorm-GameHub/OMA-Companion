import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { invalidateNotificationRuleCache } from "@/lib/notify-dispatch";

export async function GET() {
  await requireRole("admin");
  const rules = await prisma.notificationRule.findMany({
    where: { deleted: false },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
  return NextResponse.json(rules);
}

type RuleUpdate = {
  key: string;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  discordDmEnabled?: boolean;
  discordChanEnabled?: boolean;
  discordChannelId?: string | null;
  titleTemplate?: string;
  bodyTemplate?: string;
  urlTemplate?: string | null;
  reminderHoursBefore?: number | null;
};

export async function PATCH(req: NextRequest) {
  await requireRole("admin");
  const updates = (await req.json()) as RuleUpdate[];

  await Promise.all(
    updates.map(({ key, ...data }) =>
      prisma.notificationRule.update({ where: { key }, data }),
    ),
  );

  invalidateNotificationRuleCache();
  return NextResponse.json({ ok: true });
}

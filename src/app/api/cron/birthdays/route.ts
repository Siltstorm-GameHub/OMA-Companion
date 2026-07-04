import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { dispatchNotification } from "@/lib/notify-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel ruft diesen Endpoint mit dem CRON_SECRET auf.
// In vercel.json ist der Zeitplan definiert: täglich 07:00 UTC (= 08:00 CET).
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now   = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");

  const usersWithBirthday = await prisma.user.findMany({
    where: {
      birthday: { not: null },
      OR: [
        { birthdayBoostUntil: null },
        { birthdayBoostUntil: { lt: now } },
      ],
    },
    select: { id: true, username: true, name: true, discordId: true, birthday: true },
  });

  const notified: string[] = [];

  for (const user of usersWithBirthday) {
    if (!user.birthday) continue;
    const bMonth = String(user.birthday.getMonth() + 1).padStart(2, "0");
    const bDay   = String(user.birthday.getDate()).padStart(2, "0");
    if (bMonth !== month || bDay !== day) continue;

    // 24h Boost aktivieren
    const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { birthdayBoostUntil: until } });
    await awardPoints(user.id, "BIRTHDAY");

    // Discord-Nachricht nur wenn discordId bekannt
    if (user.discordId) {
      await dispatchNotification("birthday", {
        users: [user.id],
        placeholders: { "{username}": `<@${user.discordId}>` },
        discordContent: `🎂 <@${user.discordId}>`,
      }).catch(() => {});
    }

    notified.push(user.username ?? user.name ?? user.id);
  }

  return NextResponse.json({ ok: true, notified });
}

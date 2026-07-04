import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers, sendPushToAll } from "@/lib/push";
import { createNotificationForUsers } from "@/lib/notifications";
import { sendDiscordDMToUsers, sendDiscordDMToAll } from "@/lib/notify-dispatch";
import { sendDiscordMessage, resolveChannelId } from "@/lib/discord-rest";

export async function POST(req: NextRequest) {
  await requireRole("admin");

  const body = await req.json() as {
    userIds?: string[];
    all?: boolean;
    title?: string;
    body?: string;
    url?: string;
    channels?: { push?: boolean; inApp?: boolean; discordDm?: boolean; discordChannel?: boolean };
    discordChannelId?: string;
  };

  const { userIds, all, title, url, channels, discordChannelId } = body;
  const messageBody = body.body;

  if (!title?.trim() || !messageBody?.trim()) {
    return NextResponse.json({ error: "Titel und Text sind Pflichtfelder" }, { status: 400 });
  }

  let targetIds: string[] = [];
  if (all) {
    const users = await prisma.user.findMany({ select: { id: true } });
    targetIds = users.map((u) => u.id);
  } else if (userIds?.length) {
    targetIds = userIds;
  } else {
    return NextResponse.json({ error: "Kein Empfänger angegeben" }, { status: 400 });
  }

  const payload = { title: title.trim(), body: messageBody.trim(), url: url?.trim() || undefined };
  const embed   = { title: payload.title, description: payload.body, url: payload.url, color: 0x2dd4bf };
  const sent: Record<string, number> = {};

  if (channels?.push) {
    await (all ? sendPushToAll(payload) : sendPushToUsers(targetIds, payload)).catch(() => {});
    sent.push = targetIds.length;
  }

  if (channels?.inApp) {
    await createNotificationForUsers(targetIds, { type: "admin", ...payload }).catch(() => {});
    sent.inApp = targetIds.length;
  }

  if (channels?.discordDm) {
    await (all ? sendDiscordDMToAll(embed) : sendDiscordDMToUsers(targetIds, embed)).catch(() => {});
    sent.discordDm = targetIds.length;
  }

  if (channels?.discordChannel) {
    const channelId = resolveChannelId(discordChannelId);
    if (channelId) {
      await sendDiscordMessage(channelId, embed).catch(() => {});
      sent.discordChannel = 1;
    }
  }

  return NextResponse.json({ ok: true, sent });
}

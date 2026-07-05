/**
 * Zentraler Dispatch für alle Benachrichtigungen. Liest eine NotificationRule
 * (admin-editierbar über /admin/notifications) und verteilt an alle aktivierten
 * Kanäle: Push, In-App, Discord-DM, Discord-Kanal.
 */
import type { NotificationRule } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers, type PushPayload } from "@/lib/push";
import { createNotificationForUsers, PREF_KEY, type NotificationType } from "@/lib/notifications";
import { sendDiscordMessage, sendDiscordDM, resolveChannelId, type DiscordEmbed } from "@/lib/discord-rest";

export interface DispatchOptions {
  /** Betroffene User (Empfänger für Push/In-App/Discord-DM). Leer = reine Kanal-Broadcast-Nachricht. */
  users: string[];
  placeholders?: Record<string, string>;
  /** Überschreibt rule.urlTemplate (nach Platzhalter-Ersetzung). */
  urlOverride?: string;
  /** Überschreibt rule.discordChannelId, z.B. event.discordChannelId. */
  discordChannelIdOverride?: string | null;
  /** Discord message content (z.B. "@here" Ping oder Gewinner-Mention). */
  discordContent?: string;
  discordFields?: { name: string; value: string; inline?: boolean }[];
  discordColor?: number;
  /** Discord-Kanal-Post überspringen, z.B. wenn der Aufrufer bereits selbst eine (reichhaltigere) Ankündigung gepostet hat. */
  skipDiscordChannel?: boolean;
}

// Ordnet jeden Regel-Key einem der bestehenden Präferenz-Typen zu
// (steuert sowohl Push- als auch In-App-Filterung nach User-Opt-out).
const RULE_TYPE: Record<string, NotificationType> = {
  event_new:          "event_start",
  event_reminder:     "event_start",
  event_started:      "event_start",
  event_ended:        "event_result",
  tournament_started: "event_start",
  tournament_result:  "event_result",
  quest_completed:    "quest",
  badge_earned:       "badge",
  badge_awarded:      "badge",
  clip_started:       "clip",
  clip_finished:      "clip",
  rank_up:            "points",
  server_approved:    "server",
  server_denied:      "server",
  server_revoked:     "server",
  leaderboard:        "admin",
  birthday:           "admin",
  lul_suggest:        "admin",
};

function fillPlaceholders(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((t, [k, v]) => t.replaceAll(k, v), text);
}

// ── Caching ───────────────────────────────────────────────────────────────────

let _cache: Record<string, NotificationRule> | null = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000;

async function loadRules(): Promise<Record<string, NotificationRule>> {
  if (_cache && Date.now() - _cacheTs < CACHE_TTL) return _cache;
  const rows = await prisma.notificationRule.findMany({ where: { deleted: false } });
  _cache = Object.fromEntries(rows.map((r) => [r.key, r]));
  _cacheTs = Date.now();
  return _cache;
}

export async function getNotificationRule(key: string): Promise<NotificationRule | null> {
  const rules = await loadRules();
  return rules[key] ?? null;
}

export function invalidateNotificationRuleCache() {
  _cache = null;
}

// ── Kanal-Helfer ──────────────────────────────────────────────────────────────

async function dispatchPush(userIds: string[], type: NotificationType, payload: PushPayload) {
  const users = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, notificationPrefs: true },
  });
  const key = PREF_KEY[type];
  const eligible = users
    .filter((u) => JSON.parse(u.notificationPrefs || "{}")[key] !== false)
    .map((u) => u.id);
  if (eligible.length) await sendPushToUsers(eligible, payload);
}

async function dispatchDiscordDm(userIds: string[], embed: DiscordEmbed) {
  const users = await prisma.user.findMany({
    where:  { id: { in: userIds }, discordId: { not: null } },
    select: { discordId: true, notificationPrefs: true },
  });
  await Promise.allSettled(
    users
      .filter((u) => JSON.parse(u.notificationPrefs || "{}").discordDm !== false)
      .map((u) => sendDiscordDM(u.discordId!, embed)),
  );
}

/** Direktnachricht an bestimmte User senden (respektiert die Discord-DM-Einstellung). Für Ad-hoc-Broadcasts. */
export async function sendDiscordDMToUsers(userIds: string[], embed: DiscordEmbed): Promise<void> {
  return dispatchDiscordDm(userIds, embed);
}

/** Direktnachricht an alle User mit verknüpftem Discord-Account senden. Für Ad-hoc-Broadcasts. */
export async function sendDiscordDMToAll(embed: DiscordEmbed): Promise<void> {
  const users = await prisma.user.findMany({ where: { discordId: { not: null } }, select: { id: true } });
  return dispatchDiscordDm(users.map((u) => u.id), embed);
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export async function dispatchNotification(ruleKey: string, opts: DispatchOptions): Promise<void> {
  const rule = await getNotificationRule(ruleKey);
  if (!rule) return;

  const placeholders = opts.placeholders ?? {};
  const title = fillPlaceholders(rule.titleTemplate, placeholders);
  const body  = fillPlaceholders(rule.bodyTemplate, placeholders);
  const url   = opts.urlOverride ?? (rule.urlTemplate ? fillPlaceholders(rule.urlTemplate, placeholders) : undefined);

  const tasks: Promise<unknown>[] = [];

  if (opts.users.length > 0) {
    const notifType = RULE_TYPE[ruleKey] ?? "admin";

    if (rule.pushEnabled) {
      tasks.push(dispatchPush(opts.users, notifType, { title, body, url }));
    }
    if (rule.inAppEnabled) {
      tasks.push(createNotificationForUsers(opts.users, { type: notifType, title, body, url }));
    }
    if (rule.discordDmEnabled) {
      tasks.push(dispatchDiscordDm(opts.users, {
        title, description: body, url, color: opts.discordColor ?? 0x2dd4bf,
      }));
    }
  }

  if (rule.discordChanEnabled && !opts.skipDiscordChannel) {
    const channelId = resolveChannelId(opts.discordChannelIdOverride ?? rule.discordChannelId);
    if (channelId) {
      tasks.push(sendDiscordMessage(
        channelId,
        {
          title,
          description: body,
          color:  opts.discordColor ?? 0x6366f1,
          fields: opts.discordFields,
          footer: { text: "OMA Companion" },
        },
        opts.discordContent,
      ));
    }
  }

  await Promise.allSettled(tasks);
}

// ── Event-gebundene Benachrichtigungen ────────────────────────────────────────

export interface EventDispatchOptions {
  placeholders?: Record<string, string>;
  discordChannelIdOverride?: string | null;
  discordContent?: string;
  discordFields?: { name: string; value: string; inline?: boolean }[];
  discordColor?: number;
  skipDiscordChannel?: boolean;
}

async function resolveAllUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({ select: { id: true } });
  return users.map((u) => u.id);
}

/** Mitspieler + Zuschauer (EventRegistration) + Streamer (EventCommunityStreamer) eines Events, ohne Duplikate. */
async function resolveEventParticipantIds(eventId: string): Promise<string[]> {
  const [regs, streamers] = await Promise.all([
    prisma.eventRegistration.findMany({ where: { eventId }, select: { userId: true } }),
    prisma.eventCommunityStreamer.findMany({ where: { eventId }, select: { userId: true } }),
  ]);
  return [...new Set([...regs.map((r) => r.userId), ...streamers.map((s) => s.userId)])];
}

/**
 * Wie dispatchNotification, aber für Benachrichtigungen mit Event-Bezug:
 * Ist rule.isEventNotification aktiv, wird automatisch zur Event-Detailseite verlinkt und
 * der Empfängerkreis anhand von rule.eventAudience ("all" | "participants") aufgelöst.
 * Ist die Regel nicht als Event-Benachrichtigung markiert, gehen die Nachrichten an alle User
 * (kein Event-Link-Override) — entspricht dem Standardverhalten aller anderen Regeln.
 */
export async function dispatchEventNotification(
  ruleKey: string,
  event: { id: string },
  opts: EventDispatchOptions = {},
): Promise<void> {
  const rule = await getNotificationRule(ruleKey);
  if (!rule) return;

  const users = rule.isEventNotification && rule.eventAudience === "participants"
    ? await resolveEventParticipantIds(event.id)
    : await resolveAllUserIds();

  await dispatchNotification(ruleKey, {
    users,
    urlOverride: rule.isEventNotification ? `/tournament/${event.id}` : undefined,
    ...opts,
  });
}

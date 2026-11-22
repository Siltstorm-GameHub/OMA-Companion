// Fehlende Standard-Regeln anlegen (Admin → Benachrichtigungen).
//
// Normalerweise legt der Seed beim Deploy alle Regeln an. Fehlt eine trotzdem (z.B. neue Regel, Seed
// noch nicht gelaufen), legt das Öffnen der Admin-Seite sie mit den Standardwerten an — dann kann man
// sie sofort bearbeiten und sieht, was neu ist. Im Admin gelöschte Regeln (deleted = true) bleiben gelöscht.

import { prisma } from "@/lib/prisma";
import { EVENT_PERSONAL_RULES } from "@/lib/notification-rule-defaults";
import { invalidateNotificationRuleCache } from "@/lib/notify-dispatch";

/** Gibt die Bezeichnungen der neu angelegten Regeln zurück. */
export async function ensureDefaultNotificationRules(): Promise<string[]> {
  const existing = new Set((await prisma.notificationRule.findMany({ select: { key: true } })).map(r => r.key));
  const missing = EVENT_PERSONAL_RULES.filter(r => !existing.has(r.key));
  if (missing.length === 0) return [];
  await prisma.notificationRule.createMany({
    data: missing.map(r => ({
      key: r.key, label: r.label, description: r.description, category: r.category,
      pushEnabled: r.pushEnabled, inAppEnabled: r.inAppEnabled, discordDmEnabled: r.discordDmEnabled,
      discordChanEnabled: r.discordChanEnabled, titleTemplate: r.titleTemplate, bodyTemplate: r.bodyTemplate,
      urlTemplate: r.urlTemplate ?? null, isEventNotification: r.isEventNotification ?? false, eventAudience: r.eventAudience ?? "all",
    })),
    skipDuplicates: true,
  });
  invalidateNotificationRuleCache();
  return missing.map(r => r.label);
}

import { prisma } from "./prisma";

/**
 * Protokoll der Admin-/Moderator-Aktionen in den Community-Jobs. Best effort: ein Fehler beim Protokollieren
 * darf die eigentliche Aktion nie scheitern lassen.
 */

export interface AuditActor { id: string; username?: string | null; name?: string | null }

export interface AuditEntry {
  action: string;
  targetType?: string; targetId?: string; targetUserId?: string; targetLabel?: string;
  jobKey?: string; reason?: string; detail?: unknown;
}

export async function logAdminAction(actor: AuditActor, entry: AuditEntry): Promise<void> {
  try {
    await prisma.communityJobAuditLog.create({
      data: {
        actorId: actor.id, actorName: actor.username ?? actor.name ?? null,
        action: entry.action, targetType: entry.targetType ?? null, targetId: entry.targetId ?? null,
        targetUserId: entry.targetUserId ?? null, targetLabel: entry.targetLabel?.slice(0, 200) ?? null,
        jobKey: entry.jobKey ?? null, reason: entry.reason?.slice(0, 500) ?? null,
        detail: entry.detail === undefined ? null : (typeof entry.detail === "string" ? entry.detail : JSON.stringify(entry.detail)).slice(0, 2000),
      },
    });
  } catch (err) {
    console.error("[community-admin-audit] Protokollierung fehlgeschlagen:", err);
  }
}

/** Name/Job zu einer Mitgliedschaft für das Protokoll (Snapshot). */
export async function memberAuditInfo(memberId: string) {
  const m = await prisma.communityJobMember.findUnique({
    where: { id: memberId }, select: { id: true, userId: true, jobKey: true, user: { select: { username: true, name: true } } },
  });
  return m ? { userId: m.userId, jobKey: m.jobKey, label: m.user.username ?? m.user.name ?? m.userId } : null;
}

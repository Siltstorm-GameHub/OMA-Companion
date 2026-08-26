// ============================================
// POST /api/internal/user-sync
// ============================================
// Empfängt Supabase Database Webhooks für INSERT/UPDATE auf der (geteilten)
// "User"-Tabelle. Legt bei Bedarf eine Community-Karte für neue oder frisch
// Discord-verknüpfte Mitglieder an (siehe lib/season/card-provisioning.ts).
//
// Muss in Supabase eingerichtet werden: Database → Webhooks → neuer Hook auf
// Tabelle "User", Events "Insert" + "Update", HTTP Request an diese Route,
// Header "Authorization: Bearer <INTERNAL_WEBHOOK_SECRET>".

import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ensureCommunityCard } from "@/lib/season/card-provisioning";

const userRecordSchema = z.object({
  id: z.string().min(1),
  discordId: z.string().min(1).nullable().optional(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
});

const webhookPayloadSchema = z.object({
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: z.string(),
  record: userRecordSchema.nullable(),
});

function isAuthorized(request: Request): boolean {
  const expectedSecret = process.env.INTERNAL_WEBHOOK_SECRET;
  if (!expectedSecret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${expectedSecret}`;
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (headerBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(headerBuf, expectedBuf);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = webhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, table, record } = parsed.data;

  if (table !== "User" || !record || (type !== "INSERT" && type !== "UPDATE")) {
    return Response.json({ skipped: true });
  }
  if (!record.discordId) {
    return Response.json({ skipped: true, reason: "no discordId" });
  }

  const result = await ensureCommunityCard({
    userId: record.id,
    discordId: record.discordId,
    displayName: record.username ?? record.name ?? "OMA-Mitglied",
  });

  return Response.json(result);
}

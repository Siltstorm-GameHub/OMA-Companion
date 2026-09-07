import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveStreams } from "@/lib/twitch";
import { awardPoints } from "@/lib/points";
import { sampleActiveTwitchChatters } from "@/lib/ssnChatSample";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Kein Eintrag in vercel.json: Vercels eigene Cron-Funktion erlaubt auf dem Hobby-Plan nur
// taegliche Ausfuehrungen. Dieser Endpoint wird stattdessen von einem externen Scheduler
// (.github/workflows/twitch-chat-coins.yml, alle 5 Minuten) mit dem CRON_SECRET aufgerufen -
// gleiches Auth-Schema wie die Vercel-Crons, nur der Aufrufer ist ein anderer.
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partners = await prisma.partner.findMany({
    where: { isActive: true, ssnSessionId: { not: null } },
    select: { id: true, name: true, twitchLogin: true, ssnSessionId: true },
  });
  if (partners.length === 0) return NextResponse.json({ ok: true, credited: [] });

  const liveStreams = await getLiveStreams(partners.map((p) => p.twitchLogin));
  const liveLogins = new Set(liveStreams.map((s) => s.user_login.toLowerCase()));
  const livePartners = partners.filter((p) => liveLogins.has(p.twitchLogin.toLowerCase()));
  if (livePartners.length === 0) return NextResponse.json({ ok: true, credited: [] });

  // Registrierte User mit verknuepftem Twitch-Login vorab laden (kleine Tabelle, ein Query reicht
  // fuer alle live Partner in diesem Durchlauf statt pro Partner erneut abzufragen).
  const users = await prisma.user.findMany({
    where: { twitchLogin: { not: null } },
    select: { id: true, twitchLogin: true, username: true },
  });
  const userByLogin = new Map(users.map((u) => [u.twitchLogin!.toLowerCase(), u]));

  // Alle live Partner parallel sampeln, damit die Gesamtlaufzeit nicht mit der Anzahl live
  // Partner waechst (wichtig fuer das Vercel-Function-Zeitlimit).
  const perPartnerChatters = await Promise.all(
    livePartners.map((partner) => sampleActiveTwitchChatters(partner.ssnSessionId!))
  );

  const credited: { partner: string; username: string }[] = [];
  for (let i = 0; i < livePartners.length; i++) {
    const partner = livePartners[i];
    const chatters = perPartnerChatters[i];
    for (const login of chatters) {
      const user = userByLogin.get(login);
      if (!user) continue;
      const result = await awardPoints(user.id, "TWITCH_CHAT_ACTIVITY");
      if (result) credited.push({ partner: partner.name, username: user.username ?? login });
    }
  }

  return NextResponse.json({ ok: true, credited });
}

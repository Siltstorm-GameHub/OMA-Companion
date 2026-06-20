import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("moderator");
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { user: { select: { username: true, name: true } } },
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  if (event.status !== "finished") {
    return NextResponse.json({ error: "Event muss abgeschlossen sein" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY nicht konfiguriert" }, { status: 500 });
  }

  try {
    const completionData = event.completionData ? JSON.parse(event.completionData) : {};
    const finalRanking: string[] = event.finalRankingJson ? JSON.parse(event.finalRankingJson) : [];

    const userMap = Object.fromEntries(
      event.registrations.map(r => [r.userId, r.user.username ?? r.user.name ?? "Unbekannt"])
    );

    const participants = event.registrations.map(r => userMap[r.userId]).filter(Boolean);

    const rankingNames = finalRanking
      .slice(0, 3)
      .map((uid, i) => `${i + 1}. ${userMap[uid] ?? uid}`)
      .join(", ");

    const mvpName = completionData.mvpUserId ? (userMap[completionData.mvpUserId] ?? completionData.mvpUserId) : null;

    const prompt = `Du bist ein professioneller Esports-Reporter. Schreibe einen kurzen, spannenden Eventbericht auf Deutsch für folgendes Community-Gaming-Event. Der Bericht soll packend und enthusiastisch sein, wie ein echter Sportreporter.

Event: ${event.title}
Spiel: ${event.game ?? "unbekannt"}
Datum: ${new Date(event.startAt).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
Teilnehmer (${participants.length}): ${participants.join(", ")}
${rankingNames ? `Platzierungen: ${rankingNames}` : ""}
${mvpName ? `MVP: ${mvpName}` : ""}
${event.finalRankingNote ? `Notiz: ${event.finalRankingNote}` : ""}

Schreibe 3–4 Sätze. Kein Markdown, keine Überschriften, nur Fließtext. Erwähne konkrete Namen aus dem Event.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    await prisma.event.update({
      where: { id },
      data: { summary },
    });

    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gemini error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

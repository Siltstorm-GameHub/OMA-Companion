import { Client, TextChannel } from "discord.js";
import { prisma } from "@/lib/prisma";

/**
 * Prüft alle fälligen PollJobs und sendet sie als native Discord-Umfrage.
 * Wird aus dem Bot-Scheduler (index.ts) jede Minute aufgerufen.
 */
export async function processPendingPolls(client: Client) {
  const now  = new Date();

  // Gesendete Umfragen nach 8 Tagen automatisch löschen
  const cutoff = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  await prisma.pollJob.deleteMany({ where: { status: "sent", sentAt: { lte: cutoff } } });

  const jobs = await prisma.pollJob.findMany({
    where: { status: "pending", scheduledAt: { lte: now } },
  });
  if (jobs.length === 0) return;

  for (const job of jobs) {
    try {
      const { question: autoQuestion, answers: autoAnswers } = await buildPoll(job.type, job.refId, job.excludedUserIds);
      const question = job.question?.trim() || autoQuestion;
      const answers  = job.customAnswers.length >= 2 ? job.customAnswers : autoAnswers;

      if (answers.length < 2) {
        await prisma.pollJob.update({
          where: { id: job.id },
          data:  { status: "failed", errorMsg: "Zu wenige Optionen (mind. 2 nötig)" },
        });
        continue;
      }

      // Discord erlaubt maximal 10 Antworten pro Poll
      const limitedAnswers = answers.slice(0, 10);

      const channel = await client.channels.fetch(job.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        await prisma.pollJob.update({
          where: { id: job.id },
          data:  { status: "failed", errorMsg: `Kanal ${job.channelId} nicht gefunden oder kein Text-Kanal` },
        });
        continue;
      }

      const msg = await (channel as TextChannel).send({
        poll: {
          question:        { text: question },
          answers:         limitedAnswers.map(a => ({ text: a })),
          duration:        job.duration,   // in Stunden
          allowMultiselect: job.allowMultiselect,
        },
      });

      await prisma.pollJob.update({
        where: { id: job.id },
        data:  { status: "sent", sentAt: new Date(), messageId: msg.id },
      });

      console.log(`📊 Poll gesendet: ${question} (${limitedAnswers.length} Optionen) → Kanal ${job.channelId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[POLL] Fehler bei Job ${job.id}:`, msg);
      await prisma.pollJob.update({
        where: { id: job.id },
        data:  { status: "failed", errorMsg: msg.slice(0, 500) },
      });
    }
  }
}

// ── Poll-Inhalte je Typ zusammenbauen ───────────────────────────────────────

async function buildPoll(type: string, refId: string, excludedUserIds: string[] = []): Promise<{ question: string; answers: string[] }> {
  // ── Event-Sieger ──────────────────────────────────────────────────────────
  if (type === "event_winner") {
    const event = await prisma.event.findUnique({
      where:   { id: refId },
      include: { registrations: { include: { user: { select: { id: true, username: true, name: true } } } } },
    });
    if (!event) throw new Error(`Event ${refId} nicht gefunden`);
    return {
      question: `Wer gewinnt „${event.title}"? 🏆`,
      answers:  event.registrations
        .filter(r => !excludedUserIds.includes(r.user.id))
        .map(r => r.user.username ?? r.user.name ?? "Unbekannt"),
    };
  }

  // ── LUL Trostpreis ────────────────────────────────────────────────────────
  if (type === "lul_trostpreis") {
    const spieltag = await prisma.lulSpieltag.findUnique({
      where:   { id: refId },
      include: { entries: { where: { role: "player" }, include: { user: { select: { id: true, username: true, name: true } } } } },
    });
    if (!spieltag) throw new Error(`Spieltag ${refId} nicht gefunden`);
    return {
      question: `Spieltag ${spieltag.number}: Wer verdient den Trostpreis? 🎁`,
      answers:  spieltag.entries
        .filter(e => !excludedUserIds.includes(e.user.id))
        .map(e => e.user.username ?? e.user.name ?? "Unbekannt"),
    };
  }

  // ── LUL Community-Support ─────────────────────────────────────────────────
  if (type === "lul_community") {
    const spieltag = await prisma.lulSpieltag.findUnique({
      where:   { id: refId },
      include: { entries: { where: { role: "spectator" }, include: { user: { select: { id: true, username: true, name: true } } } } },
    });
    if (!spieltag) throw new Error(`Spieltag ${refId} nicht gefunden`);
    return {
      question: `Spieltag ${spieltag.number}: Wer gewinnt den Community-Support-Preis? 💛`,
      answers:  spieltag.entries
        .filter(e => !excludedUserIds.includes(e.user.id))
        .map(e => e.user.username ?? e.user.name ?? "Unbekannt"),
    };
  }

  throw new Error(`Unbekannter Poll-Typ: ${type}`);
}

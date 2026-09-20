import { prisma } from "./prisma";
import { dispatchNotification } from "./notify-dispatch";
import { mentionToken } from "./report-mentions";

/**
 * Interviews: ein Journalist stellt einem Community-Mitglied bis zu 8 Fragen, die Person antwortet über eine
 * eigene Seite (/interviews/[id]) und der Journalist fügt die Antworten als Q&A in einen Bericht ein.
 */

const MAX_QUESTIONS = 8;
const QUESTION_MAX = 300;
const ANSWER_MAX = 1500;
const MAX_PENDING_TOTAL = 5;

async function nameOf(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } }).catch(() => null);
  return u?.username ?? u?.name ?? "Jemand";
}

function parseList(json: string | null): string[] {
  try { const v = json ? JSON.parse(json) : []; return Array.isArray(v) ? v.map(x => String(x)) : []; } catch { return []; }
}

export type InterviewResult = { ok: true; id?: string } | { error: string };

export async function createInterview(journalistId: string, intervieweeId: string, questions: string[]): Promise<InterviewResult> {
  const isJournalist = await prisma.communityJobMember.findFirst({
    where: { userId: journalistId, jobKey: "journalist", status: { in: ["ACTIVE", "WARNED"] } },
  });
  if (!isJournalist) return { error: "Nur aktive Journalisten können Interviews anfragen" };
  if (intervieweeId === journalistId) return { error: "Du kannst dich nicht selbst interviewen" };
  if (!(await prisma.user.findUnique({ where: { id: intervieweeId }, select: { id: true } }))) return { error: "Person nicht gefunden" };

  const cleaned = questions.map(q => q.trim()).filter(Boolean);
  if (cleaned.length === 0) return { error: "Mindestens eine Frage erforderlich" };
  if (cleaned.length > MAX_QUESTIONS) return { error: `Höchstens ${MAX_QUESTIONS} Fragen` };
  if (cleaned.some(q => q.length > QUESTION_MAX)) return { error: `Eine Frage darf höchstens ${QUESTION_MAX} Zeichen lang sein` };

  const [samePerson, total] = await Promise.all([
    prisma.interviewRequest.count({ where: { journalistId, intervieweeId, status: "PENDING" } }),
    prisma.interviewRequest.count({ where: { journalistId, status: "PENDING" } }),
  ]);
  if (samePerson > 0) return { error: "Diese Person hat noch eine offene Interview-Anfrage von dir" };
  if (total >= MAX_PENDING_TOTAL) return { error: `Du hast schon ${MAX_PENDING_TOTAL} offene Interview-Anfragen` };

  const interview = await prisma.interviewRequest.create({
    data: { journalistId, intervieweeId, questionsJson: JSON.stringify(cleaned) },
  });
  dispatchNotification("interview_request", {
    users: [intervieweeId],
    placeholders: { "{journalistName}": await nameOf(journalistId), "{interviewId}": interview.id },
  }).catch(() => {});
  return { ok: true, id: interview.id };
}

/** Beteiligte (Journalist/Befragte) und Admins dürfen ein Interview sehen. */
export async function getInterviewForUser(userId: string, id: string, isAdmin = false) {
  const interview = await prisma.interviewRequest.findUnique({
    where: { id },
    include: {
      journalist: { select: { id: true, username: true, name: true } },
      interviewee: { select: { id: true, username: true, name: true } },
    },
  });
  if (!interview) return null;
  if (interview.journalistId !== userId && interview.intervieweeId !== userId && !isAdmin) return null;
  return {
    id: interview.id, status: interview.status, createdAt: interview.createdAt, answeredAt: interview.answeredAt,
    questions: parseList(interview.questionsJson), answers: parseList(interview.answersJson),
    journalist: interview.journalist, interviewee: interview.interviewee,
    viewerIsInterviewee: interview.intervieweeId === userId,
  };
}

export async function answerInterview(intervieweeId: string, id: string, answers: string[]): Promise<InterviewResult> {
  const interview = await prisma.interviewRequest.findUnique({ where: { id } });
  if (!interview || interview.intervieweeId !== intervieweeId) return { error: "Interview nicht gefunden" };
  if (interview.status !== "PENDING") return { error: "Dieses Interview ist bereits abgeschlossen" };

  const questions = parseList(interview.questionsJson);
  if (answers.length !== questions.length) return { error: "Antworten passen nicht zu den Fragen" };
  const trimmed = answers.map(a => a.trim());
  if (trimmed.every(a => !a)) return { error: "Bitte beantworte mindestens eine Frage" };
  if (trimmed.some(a => a.length > ANSWER_MAX)) return { error: `Eine Antwort darf höchstens ${ANSWER_MAX} Zeichen lang sein` };

  await prisma.interviewRequest.update({
    where: { id }, data: { status: "ANSWERED", answersJson: JSON.stringify(trimmed), answeredAt: new Date() },
  });
  dispatchNotification("interview_answered", {
    users: [interview.journalistId], placeholders: { "{intervieweeName}": await nameOf(intervieweeId) },
  }).catch(() => {});
  return { ok: true };
}

export async function declineInterview(intervieweeId: string, id: string): Promise<InterviewResult> {
  const updated = await prisma.interviewRequest.updateMany({
    where: { id, intervieweeId, status: "PENDING" }, data: { status: "DECLINED", answeredAt: new Date() },
  });
  return updated.count === 0 ? { error: "Interview nicht gefunden oder schon abgeschlossen" } : { ok: true };
}

/** Eigene Interviews des Journalisten samt fertigem Markdown für beantwortete. */
export async function listMyInterviews(journalistId: string) {
  const items = await prisma.interviewRequest.findMany({
    where: { journalistId }, orderBy: { createdAt: "desc" }, take: 15,
    include: { interviewee: { select: { id: true, username: true, name: true } } },
  });
  return items.map(i => {
    const questions = parseList(i.questionsJson);
    const answers = parseList(i.answersJson);
    const person = i.interviewee.username ?? i.interviewee.name ?? "?";
    const qa = i.status === "ANSWERED"
      ? questions.map((q, idx) => (answers[idx] ? `**${q}**\n> ${answers[idx].replace(/\n+/g, "\n> ")}` : null)).filter(Boolean).join("\n\n")
      : null;
    return {
      id: i.id, status: i.status, createdAt: i.createdAt, answeredAt: i.answeredAt,
      questionCount: questions.length, interviewee: i.interviewee,
      markdown: qa ? `## Interview mit ${mentionToken(person, i.interviewee.id)}\n\n${qa}` : null,
    };
  });
}

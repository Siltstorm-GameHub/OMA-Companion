import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createInterview, listMyInterviews } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

/** Eigene Interviews des Journalisten (mit fertigem Markdown für beantwortete). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json({ interviews: await listMyInterviews(user.id) });
}

/** POST { intervieweeId, questions: string[] } — Interview anfragen. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { intervieweeId, questions } = await req.json().catch(() => ({}));
  if (typeof intervieweeId !== "string" || !Array.isArray(questions) || !questions.every((q: unknown) => typeof q === "string")) {
    return NextResponse.json({ error: "intervieweeId und questions (Liste von Texten) erforderlich" }, { status: 400 });
  }

  const result = await createInterview(user.id, intervieweeId, questions);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

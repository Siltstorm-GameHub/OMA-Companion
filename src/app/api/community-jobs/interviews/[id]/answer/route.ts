import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { answerInterview, declineInterview } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

/** POST { answers: string[] } — Antworten abgeben; POST { decline: true } — Anfrage ablehnen. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const { answers, decline } = await req.json().catch(() => ({}));

  const result = decline === true
    ? await declineInterview(user.id, id)
    : Array.isArray(answers) && answers.every((a: unknown) => typeof a === "string")
      ? await answerInterview(user.id, id, answers)
      : { error: "answers (Liste von Texten) erforderlich" };
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

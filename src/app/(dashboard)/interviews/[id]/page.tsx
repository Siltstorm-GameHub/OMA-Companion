import { notFound } from "next/navigation";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { getInterviewForUser } from "@/lib/interview-service";
import InterviewClient from "./InterviewClient";

export const dynamic = "force-dynamic";

/** Interview beantworten (Befragte) bzw. ansehen (Journalist). */
export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) notFound();

  const { id } = await params;
  const interview = await getInterviewForUser(user.id, id, hasMinRole(user.role, "moderator"));
  if (!interview) notFound();

  return <InterviewClient interview={JSON.parse(JSON.stringify(interview))} />;
}

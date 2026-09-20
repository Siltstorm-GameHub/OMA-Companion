"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { formatBerlinDate } from "@/lib/time";

interface Interview {
  id: string; status: string; createdAt: string; answeredAt: string | null;
  questions: string[]; answers: string[];
  journalist: { id: string; username: string | null; name: string | null };
  interviewee: { id: string; username: string | null; name: string | null };
  viewerIsInterviewee: boolean;
}

const name = (u: { username: string | null; name: string | null }) => u.username ?? u.name ?? "?";

export default function InterviewClient({ interview }: { interview: Interview }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>(interview.questions.map((_, i) => interview.answers[i] ?? ""));
  const [busy, setBusy] = useState<"send" | "decline" | null>(null);
  const pending = interview.status === "PENDING";
  const canAnswer = pending && interview.viewerIsInterviewee;

  async function submit(decline: boolean) {
    if (decline && !window.confirm("Interview-Anfrage wirklich ablehnen?")) return;
    setBusy(decline ? "decline" : "send");
    try {
      const res = await fetch(`/api/community-jobs/interviews/${interview.id}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(decline ? { decline: true } : { answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
      toast.success(decline ? "Anfrage abgelehnt" : "Danke — deine Antworten sind raus!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-bold text-white">Interview</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {interview.viewerIsInterviewee
            ? `${name(interview.journalist)} möchte dich für einen Bericht im Community-Board interviewen.`
            : `Interview mit ${name(interview.interviewee)} · angefragt am ${formatBerlinDate(interview.createdAt)}`}
        </p>
      </div>

      {!pending && (
        <p className={`text-xs ${interview.status === "ANSWERED" ? "text-emerald-400" : "text-gray-500"}`}>
          {interview.status === "ANSWERED" ? "Beantwortet" : "Abgelehnt"}{interview.answeredAt ? ` am ${formatBerlinDate(interview.answeredAt)}` : ""}
        </p>
      )}
      {pending && !canAnswer && <p className="text-xs text-amber-400">Wartet noch auf die Antworten von {name(interview.interviewee)}.</p>}

      <div className="glass rounded-2xl p-4 space-y-4">
        {interview.questions.map((q, i) => (
          <div key={i} className="space-y-1.5">
            <p className="text-sm font-semibold text-white">{i + 1}. {q}</p>
            {canAnswer ? (
              <textarea value={answers[i]} onChange={e => setAnswers(a => a.map((x, j) => (j === i ? e.target.value : x)))} rows={3} maxLength={1500}
                placeholder="Deine Antwort (leer lassen, wenn du nicht antworten möchtest)"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-y" />
            ) : (
              <p className="text-sm text-gray-300 whitespace-pre-line">{interview.answers[i] || <span className="text-gray-600">—</span>}</p>
            )}
          </div>
        ))}
      </div>

      {canAnswer && (
        <div className="flex justify-between gap-2">
          <Button variant="ghost" loading={busy === "decline"} disabled={busy !== null} onClick={() => submit(true)}>Ablehnen</Button>
          <Button loading={busy === "send"} disabled={busy !== null || answers.every(a => !a.trim())} onClick={() => submit(false)}>Antworten senden</Button>
        </div>
      )}
      {canAnswer && <p className="text-[11px] text-gray-600">Deine Antworten kann der Journalist in seinem Bericht veröffentlichen — mit deinem Namen.</p>}
    </div>
  );
}
